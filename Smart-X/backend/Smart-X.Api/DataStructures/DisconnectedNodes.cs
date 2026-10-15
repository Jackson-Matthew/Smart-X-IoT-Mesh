namespace Smart_X.Api.DataStructures
{
    // HashSet only stores unique items, and Add() returns false when the item
    // is already there. That return value is how we avoid processing the same
    // alert twice: only the FIRST Add() returns true.
    public class DisconnectedNodes
    {
        private readonly HashSet<string> _disconnected =
            new(StringComparer.OrdinalIgnoreCase);

        // Keys look like "PUMP-001:PowerSpike".
        private readonly HashSet<string> _activeAlerts =
            new(StringComparer.OrdinalIgnoreCase);

        private readonly object _lock = new();

        // true  = newly disconnected, raise an alert.
        // false = already known, ignore the duplicate.
        public bool MarkDisconnected(string nodeId)
        {
            lock (_lock) { return _disconnected.Add(nodeId); }
        }

        public bool MarkReconnected(string nodeId)
        {
            lock (_lock) { return _disconnected.Remove(nodeId); }
        }

        public bool TryRaiseAlert(string nodeId, string alertType)
        {
            lock (_lock) { return _activeAlerts.Add($"{nodeId}:{alertType}"); }
        }

        // Called when the problem clears so it can be raised again later.
        public void ClearAlert(string nodeId, string alertType)
        {
            lock (_lock) { _activeAlerts.Remove($"{nodeId}:{alertType}"); }
        }

        public List<string> GetDisconnected()
        {
            lock (_lock) { return _disconnected.ToList(); }
        }

        public List<string> GetActiveAlerts()
        {
            lock (_lock) { return _activeAlerts.ToList(); }
        }
    }
}
