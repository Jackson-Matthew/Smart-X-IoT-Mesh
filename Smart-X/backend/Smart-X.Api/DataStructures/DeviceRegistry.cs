using Smart_X.Api.Models;

namespace Smart_X.Api.DataStructures
{
    // Dictionary lookups are O(1): the key is hashed and the device is found
    // directly, no matter whether there are 10 or 10 000 devices. Looping
    // through a List would get slower with every device added.
    // Two dictionaries give two instant ways in: node ID (what a telemetry
    // packet carries) and MAC address (the hardware identity).
    public class DeviceRegistry
    {
        private readonly Dictionary<string, Sensor> _byNodeId =
            new(StringComparer.OrdinalIgnoreCase);

        private readonly Dictionary<string, Sensor> _byMac =
            new(StringComparer.OrdinalIgnoreCase);

        private readonly object _lock = new();

        public int Count
        {
            get { lock (_lock) { return _byNodeId.Count; } }
        }

        public void Register(Sensor sensor)
        {
            ArgumentNullException.ThrowIfNull(sensor);
            lock (_lock)
            {
                _byNodeId[sensor.DeviceIdentifier] = sensor;
                _byMac[sensor.MacAddress] = sensor;
            }
        }

        public Sensor? FindByNodeId(string nodeId)
        {
            lock (_lock)
            {
                return _byNodeId.TryGetValue(nodeId, out var sensor) ? sensor : null;
            }
        }

        public Sensor? FindByMac(string mac)
        {
            lock (_lock)
            {
                return _byMac.TryGetValue(mac, out var sensor) ? sensor : null;
            }
        }

        public List<Sensor> GetAll()
        {
            lock (_lock) { return _byNodeId.Values.ToList(); }
        }
    }
}
