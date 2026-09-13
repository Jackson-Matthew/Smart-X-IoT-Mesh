namespace Smart_X.Api.Models
{
    public class SensorMedia
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string OriginalFileName { get; set; } = string.Empty;

        public string StoredFileName { get; set; } = string.Empty;

        public string ContentType { get; set; } = string.Empty;

        public long FileSize { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}