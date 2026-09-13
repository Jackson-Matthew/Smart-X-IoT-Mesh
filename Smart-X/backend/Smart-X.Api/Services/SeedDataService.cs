using Smart_X.Api.Models;
using Smart_X.Api.Models.Telemetry;

namespace Smart_X.Api.Services
{
    public class SeedDataService
    {
        private readonly SensorService _sensorService;
        private readonly ITelemetryService _telemetryService;
        private readonly IssueService _issueService;

        public SeedDataService(
            SensorService sensorService,
            ITelemetryService telemetryService,
            IssueService issueService)
        {
            _sensorService = sensorService;
            _telemetryService = telemetryService;
            _issueService = issueService;
        }

        public async Task SeedAsync()
        {
            // Prevent duplicate seed data if the application
            // is restarted during development.
            if (_sensorService.GetAllSensors().Count > 0)
            {
                return;
            }

            var environmentalSensor = _sensorService.RegisterSensor(
                new DTOs.SensorRegistrationRequest
                {
                    DeviceIdentifier = "TEMP-001",
                    MacAddress = "AA:BB:CC:DD:EE:01",
                    DeploymentLocation = "Building A - Room 101",
                    Category = SensorCategory.Environmental
                });

            var offlineEnvironmentalSensor = _sensorService.RegisterSensor(
                new DTOs.SensorRegistrationRequest
                {
                    DeviceIdentifier = "TEMP-002",
                    MacAddress = "AA:BB:CC:DD:EE:02",
                    DeploymentLocation = "Building A - Room 102",
                    Category = SensorCategory.Environmental
                });

            var powerSensor = _sensorService.RegisterSensor(
                new DTOs.SensorRegistrationRequest
                {
                    DeviceIdentifier = "POWER-001",
                    MacAddress = "AA:BB:CC:DD:EE:03",
                    DeploymentLocation = "Building A - Main Distribution",
                    Category = SensorCategory.PowerConsumption
                });

            var actuatorSensor = _sensorService.RegisterSensor(
                new DTOs.SensorRegistrationRequest
                {
                    DeviceIdentifier = "ACT-001",
                    MacAddress = "AA:BB:CC:DD:EE:04",
                    DeploymentLocation = "Building A - HVAC",
                    Category = SensorCategory.Actuator
                });

            await _telemetryService.ProcessTelemetryAsync(
                new TelemetryPacket<EnvironmentalTelemetry>
                {
                    DeviceIdentifier = environmentalSensor.DeviceIdentifier,
                    Timestamp = DateTime.UtcNow.AddMinutes(-2),
                    Data = new EnvironmentalTelemetry
                    {
                        Temperature = 23.5,
                        Humidity = 48.2,
                        Pressure = 1012.4
                    }
                });

            await _telemetryService.ProcessTelemetryAsync(
                new TelemetryPacket<PowerConsumptionTelemetry>
                {
                    DeviceIdentifier = powerSensor.DeviceIdentifier,
                    Timestamp = DateTime.UtcNow.AddMinutes(-1),
                    Data = new PowerConsumptionTelemetry
                    {
                        Voltage = 230.4,
                        Current = 4.8,
                        Power = 1105.9,
                        EnergyConsumed = 14.7
                    }
                });

            await _telemetryService.ProcessTelemetryAsync(
                new TelemetryPacket<ActuatorTelemetry>
                {
                    DeviceIdentifier = actuatorSensor.DeviceIdentifier,
                    Timestamp = DateTime.UtcNow.AddSeconds(-30),
                    Data = new ActuatorTelemetry
                    {
                        State = "Running",
                        Value = 72
                    }
                });

            _issueService.AddIssue(
                new ReportedIssue
                {
                    SensorId = offlineEnvironmentalSensor.Id,
                    DeviceIdentifier = offlineEnvironmentalSensor.DeviceIdentifier,
                    Description =
                        "Sensor has stopped transmitting telemetry and requires investigation.",
                    Severity = "High",
                    ReportedAt = DateTime.UtcNow.AddMinutes(-5),
                    Resolved = false
                });
        }
    }
}