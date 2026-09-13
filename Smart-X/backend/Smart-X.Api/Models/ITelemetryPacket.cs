namespace Smart_X.Api.Models
{
    public interface ITelemetryPacket
    {
        Guid PacketId { get; }

        string DeviceIdentifier { get; }

        DateTime Timestamp { get; }

        string TelemetryType { get; }

        object Data { get; }
    }
}