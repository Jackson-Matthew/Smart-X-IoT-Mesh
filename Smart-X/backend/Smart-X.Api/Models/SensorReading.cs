namespace Smart_X.Api.Models
{

    // A simple set of sensor values that can be added together.
    // OVERLOADING: C# normally only knows how to "+" numbers and strings.
    // Here we overload the + operator so two readings can be combined with
    // normal maths syntax:  var total = meter1 + meter2;

    public class SensorReading
    {
        public double Temperature { get; set; }

        public double Humidity { get; set; }

        public double Power { get; set; }

        public double EnergyConsumed { get; set; }

        // An operator overload is a special static method named "operator +".
        // It takes the values on the left and right of the + sign and returns
        // a NEW reading; the originals are not changed.
        public static SensorReading operator +(
            SensorReading left,
            SensorReading right)
        {
            ArgumentNullException.ThrowIfNull(left);
            ArgumentNullException.ThrowIfNull(right);

            // Add each value field by field (aggregate load of two meters).
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