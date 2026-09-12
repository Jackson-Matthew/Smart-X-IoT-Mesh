namespace Smart_X.Api.Models
{
    public class Sensor
    {
        public Guid Id { get; set; }

        public string DeviceIdentifier { get; set; } = string.Empty;

        public string MacAddress { get; set; } = string.Empty;

        public string DeploymentLocation { get; set; } = string.Empty;

        public SensorCategory Category { get; set; }

        public bool IsOnline { get; set; }

        public DateTime RegisteredAt { get; set; }

        public DateTime? LastSeen { get; set; }

    }
}
