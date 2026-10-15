using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    /// <summary>
    /// Contract for the ingestion pipeline. The generic method accepts a
    /// telemetry packet of any payload type T and QUEUES it; the background
    /// TelemetryProcessor later calls ProcessPendingAsync to work the queues.
    /// </summary>
    public interface ITelemetryService
    {
        Task ProcessTelemetryAsync<T>(TelemetryPacket<T> packet);

        // Processes every waiting critical alert first, then up to
        // maxTelemetry packets from the normal FIFO queue.
        Task<DrainResult> ProcessPendingAsync(int maxTelemetry);
    }

    public record DrainResult(int Alerts, int Packets, int Remaining);
}
