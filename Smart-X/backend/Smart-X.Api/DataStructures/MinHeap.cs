namespace Smart_X.Api.DataStructures
{
    // MIN-HEAP (binary heap stored in a List).
    // A heap is a complete binary tree where every parent is <= its children,
    // so the smallest priority is ALWAYS at index 0. Because it is complete it
    // can live in a flat array: for the item at index i
    //   parent = (i - 1) / 2,  left child = 2i + 1,  right child = 2i + 2.
    //   Push (add at the end, "sift up")   = O(log n)
    //   Pop  (remove the root, "sift down") = O(log n)
    //   Peek (look at the root)            = O(1)
    // Prim's algorithm uses it to always grab the cheapest wireless link next.
    public class MinHeap<TElement>
    {
        private readonly List<(TElement Element, double Priority)> _items = [];

        public int Count => _items.Count;

        public void Push(TElement element, double priority)
        {
            _items.Add((element, priority));
            SiftUp(_items.Count - 1);
        }

        public (TElement Element, double Priority) Pop()
        {
            if (_items.Count == 0)
            {
                throw new InvalidOperationException("The heap is empty.");
            }

            var root = _items[0];
            int last = _items.Count - 1;

            // Move the last item to the top, then push it down into place.
            _items[0] = _items[last];
            _items.RemoveAt(last);

            if (_items.Count > 0)
            {
                SiftDown(0);
            }

            return root;
        }

        public (TElement Element, double Priority) Peek()
        {
            if (_items.Count == 0)
            {
                throw new InvalidOperationException("The heap is empty.");
            }

            return _items[0];
        }

        private void SiftUp(int index)
        {
            while (index > 0)
            {
                int parent = (index - 1) / 2;

                if (_items[index].Priority >= _items[parent].Priority)
                {
                    break;
                }

                (_items[index], _items[parent]) = (_items[parent], _items[index]);
                index = parent;
            }
        }

        private void SiftDown(int index)
        {
            while (true)
            {
                int left = 2 * index + 1;
                int right = 2 * index + 2;
                int smallest = index;

                if (left < _items.Count &&
                    _items[left].Priority < _items[smallest].Priority)
                {
                    smallest = left;
                }

                if (right < _items.Count &&
                    _items[right].Priority < _items[smallest].Priority)
                {
                    smallest = right;
                }

                if (smallest == index)
                {
                    break;
                }

                (_items[index], _items[smallest]) = (_items[smallest], _items[index]);
                index = smallest;
            }
        }
    }
}
