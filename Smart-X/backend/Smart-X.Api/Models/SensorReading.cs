namespace Smart_X.Api.Models
{
    public class SensorReading
    {
        public double Temperature { get; set; }

        public double Humidity { get; set; }

        public double Power { get; set; }

        public double EnergyConsumed { get; set; }

        public static SensorReading operator +(
            SensorReading left,
            SensorReading right)
        {
            ArgumentNullException.ThrowIfNull(left);
            ArgumentNullException.ThrowIfNull(right);

            return new SensorReading
            {
                Temperature = left.Temperature + right.Temperature,
                Humidity = left.Humidity + right.Humidity,
                Power = left.Power + right.Power,
                EnergyConsumed =
                    left.EnergyConsumed + right.EnergyConsumed
            };
        }
    }
}