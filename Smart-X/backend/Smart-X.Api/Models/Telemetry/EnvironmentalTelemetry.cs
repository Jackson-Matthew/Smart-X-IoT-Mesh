namespace Smart_X.Api.Models.Telemetry
{
    public class EnvironmentalTelemetry
    {
        public double Temperature { get; set; }

        public double Humidity { get; set; }

        public double? Pressure { get; set; }
    }
}