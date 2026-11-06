namespace Smart_X.Api.Models
{
    // One thing that happened: an alert fired, the user searched, or the user
    // sent a command. The engine learns from the ORDER of these actions.
    public class UserAction
    {
        // "Alert", "Search" or "Command".
        public string Kind { get; set; } = string.Empty;

        // The device involved (empty for a search with no device).
        public string DeviceIdentifier { get; set; } = string.Empty;

        // Alert type, search text or command name.
        public string Detail { get; set; } = string.Empty;

        // Extra info to repeat a command, e.g. the new state "On".
        public string Value { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Identity of an action for pattern counting. Two actions with the
        // same key are "the same thing" (e.g. every "Search|pump a").
        public string Key =>
            $"{Kind}|{DeviceIdentifier.ToLowerInvariant()}|{Detail.ToLowerInvariant()}";
    }

    // A recommendation learned from history: "after X you usually do Y".
    public class Suggestion
    {
        // "Command" or "Search".
        public string Kind { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        // Plain-English evidence, shown to the user.
        public string Reason { get; set; } = string.Empty;

        // 0-1: how often this follows the trigger (count / all followers).
        public double Confidence { get; set; }

        // How many times the pattern has been seen.
        public int Support { get; set; }

        public string DeviceIdentifier { get; set; } = string.Empty;

        public string CommandName { get; set; } = string.Empty;

        public string NewState { get; set; } = string.Empty;

        public string SearchText { get; set; } = string.Empty;
    }

    // A finding from live data: a faulty, offline or out-of-range device.
    public class Insight
    {
        // 1 = critical, 2 = warning.
        public int Severity { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Detail { get; set; } = string.Empty;

        public string DeviceIdentifier { get; set; } = string.Empty;
    }

    // One learned pattern, exposed so the marker can SEE the history behind
    // the suggestions.
    public class LearnedPattern
    {
        public string Trigger { get; set; } = string.Empty;

        public string Next { get; set; } = string.Empty;

        public int Count { get; set; }
    }

    public class InsightsResponse
    {
        public List<Suggestion> Suggestions { get; set; } = [];

        public List<Insight> Insights { get; set; } = [];

        public List<LearnedPattern> Patterns { get; set; } = [];

        public int ActionsRecorded { get; set; }
    }
}
