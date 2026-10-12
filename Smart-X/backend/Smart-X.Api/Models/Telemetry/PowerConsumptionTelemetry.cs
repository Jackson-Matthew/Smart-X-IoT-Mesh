namespace Smart_X.Api.Models.Telemetry
{
    public class PowerConsumptionTelemetry
    {
        public double Voltage { get; set; }

        public double Current { get; set; }

        public double Power { get; set; }

        public double EnergyConsumed { get; set; }
    }
}