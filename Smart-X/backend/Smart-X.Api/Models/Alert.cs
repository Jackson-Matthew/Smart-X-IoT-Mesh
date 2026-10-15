namespace Smart_X.Api.Models
{
    // A warning raised when a reading is dangerous (power spike, moisture drop)
    // or a device goes silent. Lower Severity number = more urgent, because
    // PriorityQueue always hands back the SMALLEST priority first.
    public class Alert
    {
        public Guid AlertId { get; set; } = Guid.NewGuid();

        public string DeviceIdentifier { get; set; } = string.Empty;

        // Short code such as "PowerSpike", "LowMoisture" or "Disconnected".
        // Together with the device it forms the key the HashSet uses to
        // stop the same alert being processed twice.
        public string AlertType { get; set; } = string.Empty;

        // 1 = critical, 2 = warning, 3 = info.
        public int Severity { get; set; } = 1;

        public string Message { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // When the alert joined the priority queue, and how many normal
        // readings were already waiting. Used by the Processing Log to show
        // how far a critical alert jumped the line.
        public DateTime QueuedAt { get; set; } = DateTime.UtcNow;

        public int BacklogAtArrival { get; set; }
    }
}
