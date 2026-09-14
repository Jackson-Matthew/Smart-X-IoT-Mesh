using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    /// <summary>
    /// Contract for the ingestion pipeline. The generic method accepts a
    /// telemetry packet of any payload type T.
    /// </summary>
    public interface ITelemetryService
    {
        Task ProcessTelemetryAsync<T>(TelemetryPacket<T> packet);
    }
}