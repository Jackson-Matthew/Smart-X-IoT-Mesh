using Smart_X.Api.DataStructures;

namespace Smart_X.Api.Services
{
    // Position of a node on the topology drawing (0-100 on both axes).
    public record MeshPosition(double X, double Y);

    // Owns the mesh GRAPH and answers the Part 3 questions:
    //   - what does the network look like right now?   (graph + node status)
    //   - which devices are still connected?           (BFS / DFS)
    //   - what is the cheapest route to the gateway?   (Prim's MST)
    //   - what happens when a node goes down?          (re-run on the healed graph)
    public class MeshTopologyService
    {
        public const string GatewayId = "GATEWAY-01";
        public const string GatewayMac = "AA:BB:CC:00:00:00";

        private readonly MeshGraph _graph = new();

        private readonly Dictionary<string, MeshPosition> _positions =
            new(StringComparer.OrdinalIgnoreCase);

        // Nodes that are down (hardware failure / power loss / simulated).
        private readonly HashSet<string> _down =
            new(StringComparer.OrdinalIgnoreCase);

        private readonly object _lock = new();

        public MeshGraph Graph => _graph;

        public void AddNode(string id, double x, double y)
        {
            lock (_lock)
            {
                _graph.AddNode(id);
                _positions[id] = new MeshPosition(x, y);
            }
        }

        public void AddLink(string a, string b, double powerCost)
        {
            lock (_lock) { _graph.AddEdge(a, b, powerCost); }
        }

        public MeshPosition PositionOf(string id) =>
            _positions.TryGetValue(id, out var p) ? p : new MeshPosition(50, 50);

        public bool IsMeshNode(string id) => _graph.Contains(id);

        public bool IsUp(string id)
        {
            lock (_lock) { return !_down.Contains(id); }
        }

        // The gateway cannot be taken down (it is the mains-powered server link).
        public bool SetDown(string id, bool down)
        {
            lock (_lock)
            {
                if (!_graph.Contains(id) ||
                    string.Equals(id, GatewayId, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                if (down) _down.Add(id); else _down.Remove(id);
                return true;
            }
        }

        public List<string> DownNodes()
        {
            lock (_lock) { return _down.OrderBy(n => n).ToList(); }
        }

        // ---------- TRAVERSAL ----------

        public List<TraversalStep> Traverse(string mode)
        {
            lock (_lock)
            {
                return mode.Equals("dfs", StringComparison.OrdinalIgnoreCase)
                    ? _graph.DepthFirst(GatewayId, IsUp)
                    : _graph.BreadthFirst(GatewayId, IsUp);
            }
        }

        // ---------- MST ----------

        public MstResult CurrentMst()
        {
            lock (_lock) { return _graph.PrimMst(GatewayId, IsUp); }
        }

        // The MST as it would be with every node healthy (used to find which
        // routes a failure forced to change).
        public MstResult BaselineMst()
        {
            lock (_lock) { return _graph.PrimMst(GatewayId, _ => true); }
        }

        // Child -> parent -> ... -> gateway, using the tree's parent pointers.
        public static List<string>? PathToGateway(MstResult mst, string node)
        {
            if (string.Equals(node, GatewayId, StringComparison.OrdinalIgnoreCase))
            {
                return [GatewayId];
            }

            if (!mst.Parent.ContainsKey(node))
            {
                return null;
            }

            var path = new List<string> { node };
            string current = node;

            while (mst.Parent.TryGetValue(current, out var next))
            {
                path.Add(next);
                current = next;
            }

            return path;
        }

        public double PathCost(List<string> path)
        {
            double cost = 0;

            for (int i = 0; i < path.Count - 1; i++)
            {
                cost += LinkCost(path[i], path[i + 1]);
            }

            return cost;
        }

        public double LinkCost(string a, string b)
        {
            lock (_lock)
            {
                var link = _graph.LinksOf(a).FirstOrDefault(
                    l => string.Equals(l.Other(a), b, StringComparison.OrdinalIgnoreCase));

                return link?.PowerCost ?? 0;
            }
        }

        // Nodes that were healthy-network routes through a down node, and what
        // happened to them: re-routed (new path) or isolated (no path left).
        public List<FailoverEntry> Failover()
        {
            var baseline = BaselineMst();
            var current = CurrentMst();
            var entries = new List<FailoverEntry>();

            foreach (var node in _graph.Nodes.OrderBy(n => n))
            {
                if (!IsUp(node))
                {
                    continue;
                }

                var oldPath = PathToGateway(baseline, node);

                if (oldPath is null || !oldPath.Any(n => !IsUp(n)))
                {
                    continue;
                }

                var newPath = PathToGateway(current, node);

                entries.Add(new FailoverEntry(
                    node,
                    oldPath,
                    newPath,
                    newPath is null ? null : PathCost(newPath)));
            }

            return entries;
        }

        // For a down node: which UP neighbours can still carry traffic, i.e.
        // "where to hop in that case". Cheapest link first.
        public List<HopOption> HopOptionsAround(string downNode)
        {
            var current = CurrentMst();

            lock (_lock)
            {
                return _graph.LinksOf(downNode)
                    .Select(l => l.Other(downNode))
                    .Where(n => IsUp(n) &&
                                (string.Equals(n, GatewayId, StringComparison.OrdinalIgnoreCase) ||
                                 current.Parent.ContainsKey(n)))
                    .Select(n => new HopOption(n, LinkCost(downNode, n)))
                    .OrderBy(h => h.LinkCost)
                    .ToList();
            }
        }
    }

    public record FailoverEntry(
        string Node,
        List<string> OldPath,
        List<string>? NewPath,
        double? NewCost);

    public record HopOption(string Node, double LinkCost);
}
