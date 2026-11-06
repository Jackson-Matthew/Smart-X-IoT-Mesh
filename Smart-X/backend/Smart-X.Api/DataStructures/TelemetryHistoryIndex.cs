using Smart_X.Api.Models;

namespace Smart_X.Api.DataStructures
{
    // One AVL tree per device, keyed on the reading's timestamp. This is the
    // HISTORICAL store used by the Network Topology page: asking for "all
    // readings between 14:00 and 16:00 for node A" walks only the branches of
    // that node's tree that overlap the range, instead of scanning every
    // reading ever received (see AvlTree.Range).
    public class TelemetryHistoryIndex
    {
        private readonly Dictionary<string, AvlTree<DateTime, ITelemetryPacket>> _trees =
            new(StringComparer.OrdinalIgnoreCase);

        private readonly object _lock = new();

        public void Add(ITelemetryPacket packet)
        {
            ArgumentNullException.ThrowIfNull(packet);

            lock (_lock)
            {
                if (!_trees.TryGetValue(packet.DeviceIdentifier, out var tree))
                {
                    tree = new AvlTree<DateTime, ITelemetryPacket>();
                    _trees[packet.DeviceIdentifier] = tree;
                }

                // Keys are unique, so nudge a clashing timestamp forward.
                var key = packet.Timestamp;

                while (tree.ContainsKey(key))
                {
                    key = key.AddTicks(1);
                }

                tree.Insert(key, packet);
            }
        }

        public HistoryQueryResult Query(string deviceIdentifier, DateTime from, DateTime to)
        {
            lock (_lock)
            {
                if (!_trees.TryGetValue(deviceIdentifier, out var tree))
                {
                    return new HistoryQueryResult([], 0, 0, 0, 0, 0, 0);
                }

                // 1. The AVL range query (once for the answer).
                var result = tree.Range(from, to);

                // 2. The same question answered the slow way: check every
                //    reading in a flat sorted list. Both are repeated and
                //    averaged (after a warm-up) so the comparison is fair and
                //    not skewed by one-off JIT start-up cost.
                var flat = tree.ToSortedList();
                const int runs = 50;

                tree.Range(from, to);
                LinearScan(flat, from, to);

                var treeTimer = System.Diagnostics.Stopwatch.StartNew();
                for (int i = 0; i < runs; i++) tree.Range(from, to);
                treeTimer.Stop();

                var scanTimer = System.Diagnostics.Stopwatch.StartNew();
                for (int i = 0; i < runs; i++) LinearScan(flat, from, to);
                scanTimer.Stop();

                return new HistoryQueryResult(
                    result.Items.Select(i => i.Value).ToList(),
                    tree.Count,
                    result.NodesVisited,
                    tree.Height,
                    Math.Round(ToMicroseconds(treeTimer) / runs, 1),
                    Math.Round(ToMicroseconds(scanTimer) / runs, 1),
                    tree.RotationCount);
            }
        }

        public int TotalReadings
        {
            get
            {
                lock (_lock) { return _trees.Values.Sum(t => t.Count); }
            }
        }

        public int CountFor(string deviceIdentifier)
        {
            lock (_lock)
            {
                return _trees.TryGetValue(deviceIdentifier, out var tree) ? tree.Count : 0;
            }
        }

        private static List<KeyValuePair<DateTime, ITelemetryPacket>> LinearScan(
            List<KeyValuePair<DateTime, ITelemetryPacket>> all, DateTime from, DateTime to)
        {
            var hits = new List<KeyValuePair<DateTime, ITelemetryPacket>>();

            foreach (var item in all)
            {
                if (item.Key >= from && item.Key <= to)
                {
                    hits.Add(item);
                }
            }

            return hits;
        }

        private static double ToMicroseconds(System.Diagnostics.Stopwatch watch) =>
            watch.ElapsedTicks * 1_000_000.0 / System.Diagnostics.Stopwatch.Frequency;
    }

    public record HistoryQueryResult(
        List<ITelemetryPacket> Readings,
        int TotalStored,
        int NodesVisited,
        int TreeHeight,
        double TreeMicroseconds,
        double LinearScanMicroseconds,
        long Rotations);
}
