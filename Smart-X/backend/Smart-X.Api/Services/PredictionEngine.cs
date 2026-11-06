using Smart_X.Api.DataStructures;
using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    // PREDICTIVE ACTION ENGINE.
    //
    // Idea (a first-order "what comes next" model):
    //   1. Every alert / search / command is recorded with a timestamp.
    //   2. When an action B happens, we look back at what happened in the
    //      previous 5 minutes. For each earlier action A we add 1 to
    //      transitions[A][B]  ("A was followed by B").
    //   3. Later, when A happens again, transitions[A] tells us what usually
    //      follows. The most frequent follower becomes a suggestion, and its
    //      confidence is  count / total followers of A.
    //
    // Data structure: Dictionary<trigger, Dictionary<next, count>> - both
    // lookups are O(1), so suggestions stay instant as history grows.
    public class PredictionEngine
    {
        private static readonly TimeSpan PairWindow = TimeSpan.FromMinutes(5);
        private const int MinSupport = 2;     // must be seen twice to count as a pattern
        private const int MaxHistory = 500;
        private const int MaxSuggestions = 5;

        private readonly DeviceRegistry _registry;
        private readonly SensorTimeline _timeline;
        private readonly DisconnectedNodes _disconnectedNodes;

        // Chronological log of everything recorded.
        private readonly List<UserAction> _history = [];

        private readonly Dictionary<string, Dictionary<string, int>> _transitions = [];

        // Remembers the last value used with a command so it can be repeated.
        private readonly Dictionary<string, string> _lastValue = [];

        // How many times each action has happened (the denominator for confidence).
        private readonly Dictionary<string, int> _occurrences = [];

        // Keys are lowercase, so keep one real example of each action to
        // show the original spelling (e.g. "PumpOn", not "pumpon").
        private readonly Dictionary<string, UserAction> _samples = [];

        private readonly object _lock = new();

        public PredictionEngine(
            DeviceRegistry registry,
            SensorTimeline timeline,
            DisconnectedNodes disconnectedNodes)
        {
            _registry = registry;
            _timeline = timeline;
            _disconnectedNodes = disconnectedNodes;
        }

        // ---------------------------------------------------------------
        // LEARNING
        // ---------------------------------------------------------------
        public void Record(UserAction action)
        {
            ArgumentNullException.ThrowIfNull(action);

            lock (_lock)
            {
                var seen = new HashSet<string>();

                // Walk backwards through recent history until we leave the window.
                for (var i = _history.Count - 1; i >= 0; i--)
                {
                    var earlier = _history[i];

                    if (action.Timestamp - earlier.Timestamp > PairWindow)
                    {
                        break;
                    }

                    // Count each distinct earlier action once, and ignore repeats of itself.
                    if (earlier.Key == action.Key || !seen.Add(earlier.Key))
                    {
                        continue;
                    }

                    if (!_transitions.TryGetValue(earlier.Key, out var followers))
                    {
                        followers = [];
                        _transitions[earlier.Key] = followers;
                    }

                    followers[action.Key] = followers.GetValueOrDefault(action.Key) + 1;
                }

                _history.Add(action);
                _occurrences[action.Key] = _occurrences.GetValueOrDefault(action.Key) + 1;
                _samples[action.Key] = action;

                if (_history.Count > MaxHistory)
                {
                    _history.RemoveAt(0);
                }

                if (!string.IsNullOrEmpty(action.Value))
                {
                    _lastValue[action.Key] = action.Value;
                }
            }
        }

        // ---------------------------------------------------------------
        // SUGGESTED ACTIONS (learned from history)
        // ---------------------------------------------------------------
        public List<Suggestion> GetSuggestions()
        {
            lock (_lock)
            {
                var now = DateTime.UtcNow;

                // Latest time each trigger happened inside the window.
                var context = new Dictionary<string, DateTime>();

                foreach (var action in _history)
                {
                    if (now - action.Timestamp <= PairWindow)
                    {
                        context[action.Key] = action.Timestamp;
                    }
                }

                var best = new Dictionary<string, Suggestion>();

                foreach (var (trigger, triggeredAt) in context)
                {
                    if (!_transitions.TryGetValue(trigger, out var followers))
                    {
                        continue;
                    }

                    // Times the trigger happened; confidence = how often it led to this.
                    var total = _occurrences.GetValueOrDefault(trigger, 1);

                    foreach (var (next, count) in followers)
                    {
                        if (count < MinSupport)
                        {
                            continue;
                        }

                        // Already done since the trigger? Then do not nag.
                        if (context.TryGetValue(next, out var doneAt) && doneAt >= triggeredAt)
                        {
                            continue;
                        }

                        var suggestion = BuildSuggestion(trigger, next, count, total);

                        if (suggestion != null &&
                            (!best.TryGetValue(next, out var existing)
                                || suggestion.Confidence > existing.Confidence))
                        {
                            best[next] = suggestion;
                        }
                    }
                }

                return best.Values
                    .OrderByDescending(s => s.Confidence)
                    .ThenByDescending(s => s.Support)
                    .Take(MaxSuggestions)
                    .ToList();
            }
        }

        private Suggestion? BuildSuggestion(string trigger, string next, int count, int total)
        {
            if (!_samples.TryGetValue(next, out var nextAction) ||
                !_samples.TryGetValue(trigger, out var triggerAction))
            {
                return null;
            }

            var kind = nextAction.Kind;
            var device = nextAction.DeviceIdentifier.ToUpperInvariant();
            var detail = nextAction.Detail;

            if (kind != "Command" && kind != "Search")
            {
                return null;   // only things the user can DO are suggested
            }

            var reason = $"{Describe(triggerAction)} happened {total} " +
                         $"time{(total == 1 ? "" : "s")} and was followed by " +
                         $"this action {count} time{(count == 1 ? "" : "s")}.";

            return new Suggestion
            {
                Kind = kind,
                Title = kind == "Command"
                    ? $"Run '{detail}' on {device}"
                    : $"Search for '{detail}'",
                Reason = reason,
                Confidence = Math.Round(Math.Min(1.0, (double)count / total), 2),
                Support = count,
                DeviceIdentifier = kind == "Command" ? device : string.Empty,
                CommandName = kind == "Command" ? detail : string.Empty,
                NewState = _lastValue.GetValueOrDefault(next, string.Empty),
                SearchText = kind == "Search" ? detail : string.Empty
            };
        }

        private static string Describe(UserAction a) => a.Kind switch
        {
            "Alert" => $"Alert '{a.Detail}' on {a.DeviceIdentifier.ToUpperInvariant()}",
            "Command" => $"Command '{a.Detail}' on {a.DeviceIdentifier.ToUpperInvariant()}",
            _ => $"Search '{a.Detail}'"
        };

        // ---------------------------------------------------------------
        // AUTOMATED INSIGHTS (from live data, shown BEFORE the user searches)
        // ---------------------------------------------------------------
        public List<Insight> GetInsights()
        {
            var insights = new List<Insight>();
            var disconnected = _disconnectedNodes.GetDisconnected();

            foreach (var sensor in _registry.GetAll())
            {
                var id = sensor.DeviceIdentifier;

                if (disconnected.Contains(id, StringComparer.OrdinalIgnoreCase))
                {
                    insights.Add(new Insight
                    {
                        Severity = 2,
                        Title = "Device disconnected",
                        Detail = $"{id} has stopped sending telemetry.",
                        DeviceIdentifier = id
                    });
                    continue;
                }

                if (sensor.LastSeen is null)
                {
                    insights.Add(new Insight
                    {
                        Severity = 2,
                        Title = "Device never reported",
                        Detail = $"{id} is registered but has not sent any telemetry.",
                        DeviceIdentifier = id
                    });
                    continue;
                }

                // Check the newest reading against the same rules the alert queue uses.
                var latest = _timeline.GetTimeline(id).LastOrDefault();

                if (latest == null)
                {
                    continue;
                }

                foreach (var (_, alert) in AlertRules.Evaluate(latest))
                {
                    if (alert != null)
                    {
                        insights.Add(new Insight
                        {
                            Severity = alert.Severity,
                            Title = $"Out-of-range reading ({alert.AlertType})",
                            Detail = alert.Message,
                            DeviceIdentifier = id
                        });
                    }
                }
            }

            return insights
                .OrderBy(i => i.Severity)
                .ThenBy(i => i.DeviceIdentifier)
                .ToList();
        }

        // ---------------------------------------------------------------
        // TRANSPARENCY: the raw patterns behind the suggestions
        // ---------------------------------------------------------------
        public InsightsResponse BuildResponse()
        {
            List<LearnedPattern> patterns;
            int recorded;

            lock (_lock)
            {
                recorded = _history.Count;

                patterns = _transitions
                    .SelectMany(t => t.Value.Select(n => new LearnedPattern
                    {
                        Trigger = Describe(_samples[t.Key]),
                        Next = Describe(_samples[n.Key]),
                        Count = n.Value
                    }))
                    .Where(p => p.Count >= MinSupport)
                    .OrderByDescending(p => p.Count)
                    .Take(10)
                    .ToList();
            }

            return new InsightsResponse
            {
                Suggestions = GetSuggestions(),
                Insights = GetInsights(),
                Patterns = patterns,
                ActionsRecorded = recorded
            };
        }

        // ---------------------------------------------------------------
        // DEMO HISTORY: past operator behaviour so the engine has something
        // real to learn from on first start. Same Record() path as live use.
        // Pattern: low moisture on MOIST-001 -> search "Pump A" -> pump on.
        // ---------------------------------------------------------------
        public void SeedHistory()
        {
            var start = DateTime.UtcNow.AddHours(-3);

            for (var i = 0; i < 3; i++)
            {
                var t = start.AddMinutes(i * 40);

                Record(new UserAction
                {
                    Kind = "Alert", DeviceIdentifier = "MOIST-001",
                    Detail = "LowMoisture", Timestamp = t
                });
                Record(new UserAction
                {
                    Kind = "Search", Detail = "Pump A",
                    Timestamp = t.AddSeconds(20)
                });
                Record(new UserAction
                {
                    Kind = "Command", DeviceIdentifier = "PUMP-001",
                    Detail = "PumpOn", Value = "On",
                    Timestamp = t.AddSeconds(45)
                });
            }
        }
    }
}
