namespace Smart_X.Api.Models
{
    // A manual override sent by the operator, e.g. "turn Pump A on".
    // PreviousState is stored so Undo knows what to put the device back to.
    public class DeviceCommand
    {
        public Guid CommandId { get; set; } = Guid.NewGuid();

        public string DeviceIdentifier { get; set; } = string.Empty;

        // What the operator asked for, e.g. "PumpOn", "RelayToggle".
        public string CommandName { get; set; } = string.Empty;

        public string PreviousState { get; set; } = string.Empty;

        public string NewState { get; set; } = string.Empty;

        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    }
}
