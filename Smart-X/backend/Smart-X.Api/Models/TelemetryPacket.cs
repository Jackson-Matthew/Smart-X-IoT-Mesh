namespace Smart_X.Api.Models
{
    public class TelemetryPacket<T>
    {
        public Guid PacketId { get; set; } = Guid.NewGuid();

        public string DeviceIdentifier { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public string TelemetryType { get; set; } = string.Empty;

        public T Data { get; set; } = default!;
    }
}