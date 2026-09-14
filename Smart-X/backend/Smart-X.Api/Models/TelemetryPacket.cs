namespace Smart_X.Api.Models
{
    // GENERICS: a reusable "envelope" for sensor data.
    // T is a placeholder filled in when the packet is created, e.g.
    //   TelemetryPacket EnvironmentalTelemetry
    //   TelemetryPacket PowerConsumptionTelemetry
    // The envelope fields (ID, device, time) are written once, only the
    // contents change. Because Data is stored as its real type T - not as
    // "object" - no casting or boxing/unboxing is needed to read it.
    // </summary>
    public class TelemetryPacket<T> : ITelemetryPacket
    {
        public Guid PacketId { get; set; } = Guid.NewGuid();

        // Which device sent the reading, e.g. "TEMP-001".
        public string DeviceIdentifier { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Works out a label from T: EnvironmentalTelemetry -> "Environmental".
        public string TelemetryType =>
            typeof(T).Name.Replace("Telemetry", string.Empty);

        // The actual reading, strongly typed as T.
        public T Data { get; set; } = default!;

        // Lets different TelemetryPacket<T> types be stored together in one
        // List<ITelemetryPacket> (see TelemetryRepository).
        object ITelemetryPacket.Data => Data!;
    }
}