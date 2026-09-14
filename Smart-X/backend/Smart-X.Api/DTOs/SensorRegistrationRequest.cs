using Smart_X.Api.Models;

namespace Smart_X.Api.DTOs
{
    public class SensorRegistrationRequest
    {
        public string DeviceIdentifier { get; set; } = string.Empty;
        public string MacAddress { get; set; } = string.Empty; 
        public string DeploymentLocation { get; set; } = string.Empty;
        public SensorCategory Category { get; set; }
    }
}