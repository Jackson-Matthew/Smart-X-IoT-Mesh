using Smart_X.Api.Models;

namespace Smart_X.Api.DataStructures
{
    // FIFO queue for NORMAL telemetry: the first packet to arrive is the
    // first one processed, so readings are handled in the order they were sent.
    // The lock is needed because many devices can POST at the same moment
    // and Queue<T> on its own is not thread-safe.
    public class TelemetryQueue
    {
        private readonly Queue<ITelemetryPacket> _queue = new();
        private readonly object _lock = new();

        public int Count
        {
            get { lock (_lock) { return _queue.Count; } }
        }

        public void Enqueue(ITelemetryPacket packet)
        {
            ArgumentNullException.ThrowIfNull(packet);
            lock (_lock) { _queue.Enqueue(packet); }
        }

        // Returns false (instead of throwing) when the queue is empty.
        public bool TryDequeue(out ITelemetryPacket? packet)
        {
            lock (_lock) { return _queue.TryDequeue(out packet); }
        }
    }
}
