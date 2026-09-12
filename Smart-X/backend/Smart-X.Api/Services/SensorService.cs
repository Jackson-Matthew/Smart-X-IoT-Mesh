using Smart_X.Api.Models;  
using Smart_X.Api.DTOs;

namespace Smart_X.Api.Services
{
    public class SensorService
    {
        private readonly List<Sensor> _sensors = [];
    
        public Sensor RegisterSensor(SensorRegistrationRequest request)
        {
            var sensor = new Sensor
            {
                Id = Guid.NewGuid(),
                DeviceIdentifier = request.DeviceIdentifier,
                MacAddress = request.MacAddress,
                DeploymentLocation = request.DeploymentLocation,
                Category = request.Category,
                IsOnline = false,
                RegisteredAt = DateTime.UtcNow
            };

            _sensors.Add(sensor);
            return sensor;
        }

        public List<Sensor> GetAllSensors()
        {
            return _sensors;
        }

        public Sensor? GetSensorById(Guid id)
        {
            return _sensors.FirstOrDefault(sensor => sensor.Id == id);
        }
    }
}
