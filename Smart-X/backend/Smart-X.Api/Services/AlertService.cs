using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    // The log of alerts that have been PROCESSED (taken off the priority
    // queue). The dashboard reads this list, so it only ever contains
    // alerts the HashSet let through - no duplicates.
    public class AlertService
    {
        private const int MaxStored = 200;

        private readonly List<Alert> _processed = [];
        private readonly object _lock = new();

        public void Add(Alert alert)
        {
            lock (_lock)
            {
                _processed.Add(alert);

                if (_processed.Count > MaxStored)
                {
                    _processed.RemoveAt(0);
                }
            }
        }

        // Newest first.
        public List<Alert> GetRecent(int take = 50)
        {
            lock (_lock)
            {
                return _processed.AsEnumerable().Reverse().Take(take).ToList();
            }
        }
    }
}
