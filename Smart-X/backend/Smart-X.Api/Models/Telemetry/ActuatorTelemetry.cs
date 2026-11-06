namespace Smart_X.Api.Models.Telemetry
{
    public class ActuatorTelemetry
    {
        public string State { get; set; } = string.Empty;

        public double? Value { get; set; }
    }
}