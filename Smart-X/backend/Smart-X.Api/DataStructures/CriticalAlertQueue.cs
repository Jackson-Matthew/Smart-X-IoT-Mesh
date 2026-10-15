using Smart_X.Api.Models;

namespace Smart_X.Api.DataStructures
{
    // PriorityQueue returns the SMALLEST priority first, so Severity 1
    // (critical) always comes out before warnings and info alerts.
    public class CriticalAlertQueue
    {
        private readonly PriorityQueue<Alert, int> _queue = new();

        private readonly object _lock = new();

        public int Count
        {
            get { lock (_lock) { return _queue.Count; } }
        }

        public void Enqueue(Alert alert)
        {
            ArgumentNullException.ThrowIfNull(alert);
            lock (_lock) { _queue.Enqueue(alert, alert.Severity); }
        }

        public bool TryDequeue(out Alert? alert)
        {
            lock (_lock) { return _queue.TryDequeue(out alert, out _); }
        }
    }
}
