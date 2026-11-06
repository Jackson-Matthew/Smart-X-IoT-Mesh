using Smart_X.Api.DataStructures;
using Xunit;

namespace Smart_X.Api.Tests
{
    public class AvlTreeTests
    {
        [Fact]
        public void SortedInserts_StayBalanced()
        {
            var tree = new AvlTree<int, int>();

            // Sorted keys are the worst case for a plain BST (height = 1000).
            for (int i = 0; i < 1000; i++)
            {
                tree.Insert(i, i);
            }

            Assert.Equal(1000, tree.Count);
            Assert.True(tree.Height <= 14, $"Height {tree.Height} is not logarithmic.");
        }

        [Fact]
        public void Range_ReturnsOnlyKeysInsideInclusiveBounds_InOrder()
        {
            var tree = new AvlTree<int, string>();

            foreach (var k in new[] { 50, 20, 70, 10, 30, 60, 80, 25, 65 })
            {
                tree.Insert(k, $"v{k}");
            }

            var result = tree.Range(25, 65);

            Assert.Equal(new[] { 25, 30, 50, 60, 65 }, result.Items.Select(i => i.Key));
        }

        [Fact]
        public void Range_VisitsFarFewerNodesThanTheTreeHolds()
        {
            var tree = new AvlTree<int, int>();

            for (int i = 0; i < 5000; i++)
            {
                tree.Insert(i, i);
            }

            var result = tree.Range(2000, 2050);

            Assert.Equal(51, result.Items.Count);
            Assert.True(result.NodesVisited < 100, $"Visited {result.NodesVisited} nodes.");
        }

        [Fact]
        public void Range_WithNoMatches_OrReversedBounds_IsEmpty()
        {
            var tree = new AvlTree<int, int>();
            tree.Insert(1, 1);
            tree.Insert(2, 2);

            Assert.Empty(tree.Range(10, 20).Items);
            Assert.Empty(tree.Range(2, 1).Items);
            Assert.Empty(new AvlTree<int, int>().Range(0, 100).Items);
        }

        [Fact]
        public void DuplicateKey_ReplacesValueWithoutGrowing()
        {
            var tree = new AvlTree<int, string>();
            tree.Insert(5, "old");
            tree.Insert(5, "new");

            Assert.Equal(1, tree.Count);
            Assert.True(tree.TryGetMax(out _, out var value));
            Assert.Equal("new", value);
        }

        [Fact]
        public void MinAndMax_ReturnTheEnds()
        {
            var tree = new AvlTree<int, int>();

            foreach (var k in new[] { 7, 3, 9, 1, 5 })
            {
                tree.Insert(k, k);
            }

            Assert.True(tree.TryGetMin(out var min, out _));
            Assert.True(tree.TryGetMax(out var max, out _));
            Assert.Equal(1, min);
            Assert.Equal(9, max);
        }
    }
}
