using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    public class TelemetryService : ITelemetryService
    {
        public Task ProcessTelemetryAsync<T>(TelemetryPacket<T> packet)
        {
            if (packet == null)
            {
                throw new ArgumentNullException(nameof(packet));
            }

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

            return Task.CompletedTask;
        }
    }
}