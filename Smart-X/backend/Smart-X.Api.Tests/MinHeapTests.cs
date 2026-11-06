using Smart_X.Api.DataStructures;
using Xunit;

namespace Smart_X.Api.Tests
{
    public class MinHeapTests
    {
        [Fact]
        public void Pop_ReturnsItemsInAscendingPriority()
        {
            var heap = new MinHeap<string>();
            heap.Push("c", 3);
            heap.Push("a", 1);
            heap.Push("e", 5);
            heap.Push("b", 2);
            heap.Push("d", 4);

            var order = new List<string>();

            while (heap.Count > 0)
            {
                order.Add(heap.Pop().Element);
            }

            Assert.Equal(new[] { "a", "b", "c", "d", "e" }, order);
        }

        [Fact]
        public void Peek_DoesNotRemove()
        {
            var heap = new MinHeap<int>();
            heap.Push(10, 10);
            heap.Push(2, 2);

            Assert.Equal(2, heap.Peek().Element);
            Assert.Equal(2, heap.Count);
        }

        [Fact]
        public void EmptyHeap_Throws()
        {
            Assert.Throws<InvalidOperationException>(() => new MinHeap<int>().Pop());
        }
    }
}
