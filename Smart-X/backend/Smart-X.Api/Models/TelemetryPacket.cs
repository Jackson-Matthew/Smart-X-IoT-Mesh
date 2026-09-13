namespace Smart_X.Api.Models
{
    public class TelemetryPacket<T> : ITelemetryPacket
    {
        public Guid PacketId { get; set; } = Guid.NewGuid();

        public string DeviceIdentifier { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public string TelemetryType =>
            typeof(T).Name.Replace("Telemetry", string.Empty);

        public T Data { get; set; } = default!;

        object ITelemetryPacket.Data => Data!;
    }
}