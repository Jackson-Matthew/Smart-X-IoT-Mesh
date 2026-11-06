using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    /// <summary>
    /// Combines sensor readings using the overloaded + operator.
    /// </summary>
    public class SensorAggregationService
    {
        public SensorReading Aggregate(
            SensorReading first,
            SensorReading second)
        {
            // This "+" calls SensorReading's operator + overload.
            return first + second;
        }
    }
}