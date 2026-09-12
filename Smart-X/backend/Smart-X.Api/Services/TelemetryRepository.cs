using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    public class TelemetryRepository : ITelemetryRepository
    {
        private readonly List<ITelemetryPacket> _telemetry = [];

        public Task AddAsync(ITelemetryPacket packet)
        {
            ArgumentNullException.ThrowIfNull(packet);

            _telemetry.Add(packet);

            return Task.CompletedTask;
        }

        public Task<IEnumerable<ITelemetryPacket>> GetByDeviceAsync(
            string deviceIdentifier)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(deviceIdentifier);

            var results = _telemetry
                .Where(packet =>
                    string.Equals(
                        packet.DeviceIdentifier,
                        deviceIdentifier,
                        StringComparison.OrdinalIgnoreCase))
                .ToList();

            return Task.FromResult<IEnumerable<ITelemetryPacket>>(
                results);
        }
    }
}