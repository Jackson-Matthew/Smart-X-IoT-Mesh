using Smart_X.Api.Models;

namespace Smart_X.Api.DataStructures
{
    // A Stack<T> is LIFO: the last command pushed is the first one popped,
    // which is exactly what "undo the last command" means.
    // Undo uses TryPop so an empty stack returns null instead of crashing.
    public class CommandUndoStack
    {
        private readonly Stack<DeviceCommand> _stack = new();
        private readonly object _lock = new();

        public int Count
        {
            get { lock (_lock) { return _stack.Count; } }
        }

        public void Push(DeviceCommand command)
        {
            ArgumentNullException.ThrowIfNull(command);
            lock (_lock) { _stack.Push(command); }
        }

        // Returns null when there is nothing to undo.
        public DeviceCommand? Undo()
        {
            lock (_lock) { return _stack.TryPop(out var command) ? command : null; }
        }

        // Newest first - Stack<T>.ToList() enumerates in pop order.
        public List<DeviceCommand> GetHistory()
        {
            lock (_lock) { return _stack.ToList(); }
        }
    }
}
