using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    public class SensorAggregationService
    {
        public SensorReading Aggregate(
            SensorReading first,
            SensorReading second)
        {
            return first + second;
        }
    }
}