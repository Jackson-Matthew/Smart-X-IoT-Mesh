namespace Smart_X.Api.Models
{
    public class ReportedIssue
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid SensorId { get; set; }

        public string DeviceIdentifier { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Severity { get; set; } = "Medium";

        public DateTime ReportedAt { get; set; } = DateTime.UtcNow;

        public bool Resolved { get; set; }
    }
}