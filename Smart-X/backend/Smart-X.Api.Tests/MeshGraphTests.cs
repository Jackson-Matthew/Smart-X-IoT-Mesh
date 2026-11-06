using Smart_X.Api.DataStructures;
using Xunit;

namespace Smart_X.Api.Tests
{
    public class MeshGraphTests
    {
        // G-A 4, A-B 1, G-C 2, A-C 3, B-D 5, C-D 6
        private static MeshGraph Build()
        {
            var g = new MeshGraph();
            g.AddEdge("G", "A", 4);
            g.AddEdge("A", "B", 1);
            g.AddEdge("G", "C", 2);
            g.AddEdge("A", "C", 3);
            g.AddEdge("B", "D", 5);
            g.AddEdge("C", "D", 6);
            return g;
        }

        [Fact]
        public void Bfs_ReachesEveryUpNode_WithFewestHops()
        {
            var steps = Build().BreadthFirst("G", _ => true);

            Assert.Equal(5, steps.Count);
            Assert.Equal(1, steps.First(s => s.Node == "A").Hops);
            Assert.Equal(2, steps.First(s => s.Node == "D").Hops);
        }

        [Fact]
        public void Bfs_AndDfs_SkipDownNodes_AndFindTheSameSet()
        {
            var g = Build();
            Func<string, bool> up = n => n != "C";

            var bfs = g.BreadthFirst("G", up).Select(s => s.Node).OrderBy(n => n).ToList();
            var dfs = g.DepthFirst("G", up).Select(s => s.Node).OrderBy(n => n).ToList();

            Assert.Equal(new[] { "A", "B", "D", "G" }, bfs);
            Assert.Equal(bfs, dfs);
        }

        [Fact]
        public void Traversal_FromADownStart_IsEmpty()
        {
            Assert.Empty(Build().BreadthFirst("G", n => n != "G"));
        }

        [Fact]
        public void Node_CutOffByFailures_IsNotReached()
        {
            var g = new MeshGraph();
            g.AddEdge("G", "A", 1);
            g.AddEdge("A", "B", 1);

            var reached = g.BreadthFirst("G", n => n != "A").Select(s => s.Node);

            Assert.DoesNotContain("B", reached);
        }

        [Fact]
        public void Prim_FindsTheMinimumTotalCost()
        {
            var mst = Build().PrimMst("G", _ => true);

            // Cheapest tree: G-C (2) + A-C (3) + A-B (1) + B-D (5) = 11.
            Assert.Equal(11, mst.TotalCost);
            Assert.Equal(4, mst.Edges.Count);
        }

        [Fact]
        public void Prim_ParentPointersLeadBackToTheGateway()
        {
            var mst = Build().PrimMst("G", _ => true);

            string node = "D";
            int guard = 0;

            while (node != "G" && guard++ < 10)
            {
                node = mst.Parent[node];
            }

            Assert.Equal("G", node);
        }

        [Fact]
        public void Prim_RecomputesAroundAFailedNode()
        {
            var healthy = Build().PrimMst("G", _ => true);
            var healed = Build().PrimMst("G", n => n != "C");

            Assert.DoesNotContain("C", healed.Parent.Keys);
            Assert.Equal(3, healed.Edges.Count);
            Assert.NotEqual(healthy.TotalCost, healed.TotalCost);
        }

        [Fact]
        public void Prim_UsesOnlyConnectedNodes()
        {
            var g = Build();
            g.AddEdge("X", "Y", 1);   // an island with no link to the gateway

            var mst = g.PrimMst("G", _ => true);

            Assert.DoesNotContain("X", mst.Parent.Keys);
            Assert.DoesNotContain("Y", mst.Parent.Keys);
        }
    }
}
