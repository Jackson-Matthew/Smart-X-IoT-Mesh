namespace Smart_X.Api.DataStructures
{
    // AVL TREE (self-balancing Binary Search Tree).
    // Every node holds one key (here: a timestamp) and one value (a reading).
    //   - Smaller keys live in the LEFT subtree, bigger keys in the RIGHT one.
    //   - After every insert the tree checks the "balance factor" of each node
    //     on the way back up (height of left - height of right). If it drifts
    //     outside -1..+1 the tree ROTATES that part so it stays bushy.
    // A plain BST fed timestamps in order (they arrive oldest -> newest) would
    // degrade into a linked list and every query would be O(n). The AVL
    // rotations keep the height at about log2(n), so:
    //   insert  = O(log n)
    //   lookup  = O(log n)
    //   range   = O(log n + k)  where k is the number of results returned
    public class AvlTree<TKey, TValue> where TKey : IComparable<TKey>
    {
        private sealed class Node
        {
            public TKey Key;
            public TValue Value;
            public Node? Left;
            public Node? Right;
            public int Height = 1;

            public Node(TKey key, TValue value)
            {
                Key = key;
                Value = value;
            }
        }

        private Node? _root;

        public int Count { get; private set; }

        // How many rotations were needed to keep the tree balanced (for the report).
        public long RotationCount { get; private set; }

        public int Height => HeightOf(_root);

        public bool IsEmpty => _root is null;

        // ---------- INSERT ----------

        public void Insert(TKey key, TValue value)
        {
            _root = Insert(_root, key, value);
        }

        private Node Insert(Node? node, TKey key, TValue value)
        {
            if (node is null)
            {
                Count++;
                return new Node(key, value);
            }

            int compare = key.CompareTo(node.Key);

            if (compare < 0)
            {
                node.Left = Insert(node.Left, key, value);
            }
            else if (compare > 0)
            {
                node.Right = Insert(node.Right, key, value);
            }
            else
            {
                // Same key: replace the value, the tree shape does not change.
                node.Value = value;
                return node;
            }

            return Rebalance(node);
        }

        // ---------- BALANCING ----------

        private static int HeightOf(Node? node) => node?.Height ?? 0;

        private static void UpdateHeight(Node node)
        {
            node.Height = 1 + Math.Max(HeightOf(node.Left), HeightOf(node.Right));
        }

        private static int BalanceFactor(Node node) =>
            HeightOf(node.Left) - HeightOf(node.Right);

        private Node Rebalance(Node node)
        {
            UpdateHeight(node);
            int balance = BalanceFactor(node);

            // Left heavy.
            if (balance > 1)
            {
                // Left-Right case: rotate the left child first.
                if (BalanceFactor(node.Left!) < 0)
                {
                    node.Left = RotateLeft(node.Left!);
                }

                return RotateRight(node);
            }

            // Right heavy.
            if (balance < -1)
            {
                // Right-Left case: rotate the right child first.
                if (BalanceFactor(node.Right!) > 0)
                {
                    node.Right = RotateRight(node.Right!);
                }

                return RotateLeft(node);
            }

            return node;
        }

        //        y                x
        //       / \              / \
        //      x   C    ==>     A   y
        //     / \                  / \
        //    A   B                B   C
        private Node RotateRight(Node y)
        {
            RotationCount++;
            Node x = y.Left!;
            y.Left = x.Right;
            x.Right = y;
            UpdateHeight(y);
            UpdateHeight(x);
            return x;
        }

        private Node RotateLeft(Node x)
        {
            RotationCount++;
            Node y = x.Right!;
            x.Right = y.Left;
            y.Left = x;
            UpdateHeight(x);
            UpdateHeight(y);
            return y;
        }

        // ---------- LOOKUPS ----------

        public bool ContainsKey(TKey key)
        {
            Node? node = _root;

            while (node is not null)
            {
                int compare = key.CompareTo(node.Key);

                if (compare == 0)
                {
                    return true;
                }

                node = compare < 0 ? node.Left : node.Right;
            }

            return false;
        }

        // Smallest key = keep walking left.
        public bool TryGetMin(out TKey key, out TValue value)
        {
            Node? node = _root;

            if (node is null)
            {
                key = default!;
                value = default!;
                return false;
            }

            while (node.Left is not null)
            {
                node = node.Left;
            }

            key = node.Key;
            value = node.Value;
            return true;
        }

        // Largest key = keep walking right (i.e. the latest reading).
        public bool TryGetMax(out TKey key, out TValue value)
        {
            Node? node = _root;

            if (node is null)
            {
                key = default!;
                value = default!;
                return false;
            }

            while (node.Right is not null)
            {
                node = node.Right;
            }

            key = node.Key;
            value = node.Value;
            return true;
        }

        // ---------- RANGE QUERY ----------

        // Returns every value whose key is between from and to (inclusive),
        // oldest first. Whole branches that cannot contain a match are skipped:
        //   - if from >= node.Key, nothing in the LEFT subtree can match;
        //   - if to   <= node.Key, nothing in the RIGHT subtree can match.
        // NodesVisited counts how much of the tree was actually touched.
        public RangeResult<TKey, TValue> Range(TKey from, TKey to)
        {
            var items = new List<KeyValuePair<TKey, TValue>>();
            var counter = new VisitCounter();

            if (from.CompareTo(to) <= 0)
            {
                CollectRange(_root, from, to, items, counter);
            }

            return new RangeResult<TKey, TValue>(items, counter.Visited);
        }

        private sealed class VisitCounter
        {
            public int Visited;
        }

        // In-order walk (left, node, right) so results come out sorted.
        private static void CollectRange(
            Node? node,
            TKey from,
            TKey to,
            List<KeyValuePair<TKey, TValue>> output,
            VisitCounter counter)
        {
            if (node is null)
            {
                return;
            }

            counter.Visited++;

            if (from.CompareTo(node.Key) < 0)
            {
                CollectRange(node.Left, from, to, output, counter);
            }

            if (from.CompareTo(node.Key) <= 0 && to.CompareTo(node.Key) >= 0)
            {
                output.Add(new KeyValuePair<TKey, TValue>(node.Key, node.Value));
            }

            if (to.CompareTo(node.Key) > 0)
            {
                CollectRange(node.Right, from, to, output, counter);
            }
        }

        // Full in-order walk, used only to compare against a linear scan.
        public List<KeyValuePair<TKey, TValue>> ToSortedList()
        {
            var items = new List<KeyValuePair<TKey, TValue>>(Count);
            InOrder(_root, items);
            return items;
        }

        private static void InOrder(Node? node, List<KeyValuePair<TKey, TValue>> output)
        {
            if (node is null)
            {
                return;
            }

            InOrder(node.Left, output);
            output.Add(new KeyValuePair<TKey, TValue>(node.Key, node.Value));
            InOrder(node.Right, output);
        }
    }

    public record RangeResult<TKey, TValue>(
        List<KeyValuePair<TKey, TValue>> Items,
        int NodesVisited);
}
