using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    /// <summary>
    /// Contract for where telemetry is stored. Today it is an in-memory list;
    /// later it could be a database without changing the code that uses it.
    /// </summary>
    public interface ITelemetryRepository
    {
        Task AddAsync(ITelemetryPacket packet);

        Task<IEnumerable<ITelemetryPacket>> GetByDeviceAsync(
            string deviceIdentifier);
    }
}