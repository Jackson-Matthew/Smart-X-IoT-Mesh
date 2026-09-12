using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    public interface ITelemetryRepository
    {
        Task AddAsync(ITelemetryPacket packet);

        Task<IEnumerable<ITelemetryPacket>> GetByDeviceAsync(
            string deviceIdentifier);
    }
}