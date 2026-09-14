namespace Smart_X.Api.Models
{
    /// <summary>
    /// Non-generic view of TelemetryPacket&lt;T&gt;. Every packet, whatever T is,
    /// promises to have these properties, so all packets fit in one list.
    /// </summary>
    public interface ITelemetryPacket
    {
        Guid PacketId { get; }

        string DeviceIdentifier { get; }

        DateTime Timestamp { get; }

        string TelemetryType { get; }

        object Data { get; }
    }
}