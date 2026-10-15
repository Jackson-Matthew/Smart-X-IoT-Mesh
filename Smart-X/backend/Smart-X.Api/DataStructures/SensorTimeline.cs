using Smart_X.Api.Models;

namespace Smart_X.Api.DataStructures
{
    // One SortedDictionary per device, keyed on timestamp. A SortedDictionary
    // keeps its keys in order automatically, so the timeline chart always
    // receives readings oldest -> newest even if packets arrive out of order.
    public class SensorTimeline
    {
        private const int MaxReadingsPerDevice = 500;

        private readonly Dictionary<string, SortedDictionary<DateTime, ITelemetryPacket>> _timelines =
            new(StringComparer.OrdinalIgnoreCase);

        private readonly object _lock = new();

        public void Add(ITelemetryPacket packet)
        {
            ArgumentNullException.ThrowIfNull(packet);

            lock (_lock)
            {
                if (!_timelines.TryGetValue(packet.DeviceIdentifier, out var timeline))
                {
                    timeline = new SortedDictionary<DateTime, ITelemetryPacket>();
                    _timelines[packet.DeviceIdentifier] = timeline;
                }

                // Keys must be unique, so nudge a clashing timestamp forward.
                var key = packet.Timestamp;
                while (timeline.ContainsKey(key))
                {
                    key = key.AddTicks(1);
                }

                timeline[key] = packet;

                // Keep memory bounded: drop the oldest reading (first key).
                if (timeline.Count > MaxReadingsPerDevice)
                {
                    timeline.Remove(timeline.Keys.First());
                }
            }
        }

        // Already in timestamp order because of the SortedDictionary.
        public List<ITelemetryPacket> GetTimeline(string deviceIdentifier)
        {
            lock (_lock)
            {
                return _timelines.TryGetValue(deviceIdentifier, out var timeline)
                    ? timeline.Values.ToList()
                    : [];
            }
        }
    }
}
