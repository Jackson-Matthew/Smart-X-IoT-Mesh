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
            return _sensors.ToList();
        }

        public Sensor? GetSensorById(Guid id)
        {
            return _sensors.FirstOrDefault(sensor => sensor.Id == id);
        }

        public Sensor? GetSensorByDeviceIdentifier(
            string deviceIdentifier)
        {
            return _sensors.FirstOrDefault(sensor =>
                string.Equals(
                    sensor.DeviceIdentifier,
                    deviceIdentifier,
                    StringComparison.OrdinalIgnoreCase));
        }

        public void UpdateSensor(Sensor sensor)
        {
            ArgumentNullException.ThrowIfNull(sensor);

            var existingSensor = _sensors.FirstOrDefault(
                existing => existing.Id == sensor.Id);

            if (existingSensor == null)
            {
                throw new InvalidOperationException(
                    "Sensor does not exist.");
            }

            existingSensor.DeviceIdentifier =
                sensor.DeviceIdentifier;

            existingSensor.MacAddress =
                sensor.MacAddress;

            existingSensor.DeploymentLocation =
                sensor.DeploymentLocation;

            existingSensor.Category =
                sensor.Category;

            existingSensor.IsOnline =
                sensor.IsOnline;

            existingSensor.RegisteredAt =
                sensor.RegisteredAt;

            existingSensor.LastSeen =
                sensor.LastSeen;
        }
    }
}