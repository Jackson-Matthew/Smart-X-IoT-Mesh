namespace Smart_X.Api.DataStructures
{
    // One wireless link between two nodes. PowerCost is the transmit energy
    // (in mW) a packet needs to cross this hop: longer / noisier links cost more.
    public record MeshEdge(string From, string To, double PowerCost)
    {
        // The node at the other end of the link.
        public string Other(string node) =>
            string.Equals(node, From, StringComparison.OrdinalIgnoreCase) ? To : From;
    }

    public record TraversalStep(string Node, string? Parent, int Hops);

    public record MstResult(
        List<MeshEdge> Edges,
        Dictionary<string, string> Parent,
        double TotalCost,
        int HeapPushes,
        int HeapPops);

    // GRAPH (undirected, weighted) stored as an ADJACENCY LIST.
    //   vertex = one ESP32 node (or the gateway)
    //   edge   = a wireless link, weighted by its power cost
    // An adjacency list keeps only the links that exist, so memory is O(V + E),
    // and "who are my neighbours?" is a single dictionary lookup.
    // A mesh is sparse (each node only hears a few neighbours), which is exactly
    // the case where a list beats an adjacency matrix (O(V^2) memory).
    public class MeshGraph
    {
        private readonly Dictionary<string, List<MeshEdge>> _adjacency =
            new(StringComparer.OrdinalIgnoreCase);

        private readonly List<MeshEdge> _edges = [];

        public IReadOnlyList<MeshEdge> Edges => _edges;

        public IEnumerable<string> Nodes => _adjacency.Keys;

        public int NodeCount => _adjacency.Count;

        public void AddNode(string node)
        {
            if (!_adjacency.ContainsKey(node))
            {
                _adjacency[node] = [];
            }
        }

        public void AddEdge(string a, string b, double powerCost)
        {
            AddNode(a);
            AddNode(b);

            var edge = new MeshEdge(a, b, powerCost);
            _edges.Add(edge);

            // Undirected: the same link is listed under both ends.
            _adjacency[a].Add(edge);
            _adjacency[b].Add(edge);
        }

        public IReadOnlyList<MeshEdge> LinksOf(string node) =>
            _adjacency.TryGetValue(node, out var links) ? links : [];

        public bool Contains(string node) => _adjacency.ContainsKey(node);

        // ---------- BFS ----------
        // Breadth-First Search: visit the start node, then all its neighbours,
        // then THEIR neighbours... using a FIFO queue. It finds every node that
        // is still connected to the start, and the fewest-hops distance to each.
        // Down nodes are skipped, so anything not visited is down OR cut off.
        // O(V + E).
        public List<TraversalStep> BreadthFirst(string start, Func<string, bool> isUp)
        {
            var order = new List<TraversalStep>();

            if (!Contains(start) || !isUp(start))
            {
                return order;
            }

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { start };
            var queue = new Queue<TraversalStep>();
            queue.Enqueue(new TraversalStep(start, null, 0));

            while (queue.Count > 0)
            {
                var current = queue.Dequeue();
                order.Add(current);

                foreach (var link in LinksOf(current.Node))
                {
                    string next = link.Other(current.Node);

                    if (isUp(next) && seen.Add(next))
                    {
                        queue.Enqueue(new TraversalStep(next, current.Node, current.Hops + 1));
                    }
                }
            }

            return order;
        }

        // ---------- DFS ----------
        // Depth-First Search: dive as deep as possible down one chain of
        // neighbours before backing up, using a LIFO stack. Finds the same
        // connected set as BFS but in a different order (and not by hop count).
        public List<TraversalStep> DepthFirst(string start, Func<string, bool> isUp)
        {
            var order = new List<TraversalStep>();

            if (!Contains(start) || !isUp(start))
            {
                return order;
            }

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var stack = new Stack<TraversalStep>();
            stack.Push(new TraversalStep(start, null, 0));

            while (stack.Count > 0)
            {
                var current = stack.Pop();

                if (!seen.Add(current.Node))
                {
                    continue;
                }

                order.Add(current);

                // Reverse so the first neighbour is explored first.
                foreach (var link in LinksOf(current.Node).Reverse())
                {
                    string next = link.Other(current.Node);

                    if (isUp(next) && !seen.Contains(next))
                    {
                        stack.Push(new TraversalStep(next, current.Node, current.Hops + 1));
                    }
                }
            }

            return order;
        }

        // ---------- PRIM'S MINIMUM SPANNING TREE ----------
        // Starting at the gateway, repeatedly attach the CHEAPEST link that
        // reaches a node not yet in the tree. A min-heap hands back that
        // cheapest link in O(log E). The result connects every reachable node
        // with the smallest possible total power cost, using V-1 links.
        // Complexity: O(E log V) with a binary heap.
        // Telemetry then travels up the tree (child -> parent) to the gateway.
        public MstResult PrimMst(string start, Func<string, bool> isUp)
        {
            var edges = new List<MeshEdge>();
            var parent = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            double total = 0;
            int pushes = 0;
            int pops = 0;

            if (!Contains(start) || !isUp(start))
            {
                return new MstResult(edges, parent, 0, 0, 0);
            }

            var inTree = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { start };
            var heap = new MinHeap<(MeshEdge Edge, string Via)>();

            void PushLinks(string node)
            {
                foreach (var link in LinksOf(node))
                {
                    string other = link.Other(node);

                    if (isUp(other) && !inTree.Contains(other))
                    {
                        heap.Push((link, node), link.PowerCost);
                        pushes++;
                    }
                }
            }

            PushLinks(start);

            while (heap.Count > 0)
            {
                var (item, cost) = heap.Pop();
                pops++;

                string newNode = item.Edge.Other(item.Via);

                // The cheapest link may lead to a node that was reached already.
                if (!inTree.Add(newNode))
                {
                    continue;
                }

                edges.Add(item.Edge);
                parent[newNode] = item.Via;
                total += cost;
                PushLinks(newNode);
            }

            return new MstResult(edges, parent, total, pushes, pops);
        }
    }
}
