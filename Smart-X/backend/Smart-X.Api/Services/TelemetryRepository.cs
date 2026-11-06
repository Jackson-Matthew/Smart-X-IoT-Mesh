using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    /// <summary>
    /// Stores every telemetry packet received by the gateway.
    /// Data structure: List&lt;ITelemetryPacket&gt;.
    /// A TelemetryPacket&lt;EnvironmentalTelemetry&gt; and a
    /// TelemetryPacket&lt;PowerConsumptionTelemetry&gt; are different types, so
    /// they share the ITelemetryPacket interface to live in ONE list.
    /// </summary>
    public class TelemetryRepository : ITelemetryRepository
    {
        // Packets are appended in the order they arrive (oldest first).
        private readonly List<ITelemetryPacket> _telemetry = [];

        // The background processor writes while API requests read, and a
        // List is not safe for that, so every access takes this lock.
        private readonly object _lock = new();

        public Task AddAsync(ITelemetryPacket packet)
        {
            ArgumentNullException.ThrowIfNull(packet);

            lock (_lock)
            {
                _telemetry.Add(packet);
            }

            return Task.CompletedTask;
        }

        public Task<IEnumerable<ITelemetryPacket>> GetByDeviceAsync(
            string deviceIdentifier)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(deviceIdentifier);

            // LINQ filter: keep only packets from the requested device.
            List<ITelemetryPacket> results;

            lock (_lock)
            {
                results = _telemetry
                    .Where(packet =>
                        string.Equals(
                            packet.DeviceIdentifier,
                            deviceIdentifier,
                            StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return Task.FromResult<IEnumerable<ITelemetryPacket>>(
                results);
        }
    }
}