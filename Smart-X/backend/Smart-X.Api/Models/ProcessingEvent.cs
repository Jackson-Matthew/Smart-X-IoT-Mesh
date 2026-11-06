namespace Smart_X.Api.Models
{
    // One line of the "Processing Log" shown on the Command Stream page.
    // It records the ORDER things were processed in, which is how the
    // priority queue's bypass of the normal queue is made visible.
    public class ProcessingEvent
    {
        public long Sequence { get; set; }

        // "Critical alert" or "Telemetry batch".
        public string Kind { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
