using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    public interface ITelemetryService
    {
        Task ProcessTelemetryAsync<T>(TelemetryPacket<T> packet);
    }
}