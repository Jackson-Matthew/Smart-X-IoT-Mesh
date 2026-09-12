using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    public class TelemetryService : ITelemetryService
    {
        private readonly ITelemetryRepository _telemetryRepository;

        public TelemetryService(
            ITelemetryRepository telemetryRepository)
        {
            _telemetryRepository = telemetryRepository;
        }

        public async Task ProcessTelemetryAsync<T>(
            TelemetryPacket<T> packet)
        {
            ArgumentNullException.ThrowIfNull(packet);

            if (string.IsNullOrWhiteSpace(packet.DeviceIdentifier))
            {
                throw new ArgumentException(
                    "Device identifier is required.",
                    nameof(packet));
            }

            if (packet.Data == null)
            {
                throw new ArgumentException(
                    "Telemetry data is required.",
                    nameof(packet));
            }

            await _telemetryRepository.AddAsync(packet);
        }
    }
}