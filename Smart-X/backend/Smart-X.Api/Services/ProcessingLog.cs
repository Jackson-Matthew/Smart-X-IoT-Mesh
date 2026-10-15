using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    // Keeps the most recent processing events (newest first when read).
    public class ProcessingLog
    {
        private const int MaxStored = 80;

        private readonly List<ProcessingEvent> _events = [];
        private readonly object _lock = new();
        private long _sequence;

        public void Add(string kind, string message)
        {
            lock (_lock)
            {
                _events.Add(new ProcessingEvent
                {
                    Sequence = ++_sequence,
                    Kind = kind,
                    Message = message
                });

                if (_events.Count > MaxStored)
                {
                    _events.RemoveAt(0);
                }
            }
        }

        public List<ProcessingEvent> GetRecent(int take = 30)
        {
            lock (_lock)
            {
                return _events.AsEnumerable().Reverse().Take(take).ToList();
            }
        }
    }
}
