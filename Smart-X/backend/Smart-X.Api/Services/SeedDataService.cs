using Smart_X.Api.Models;
using Smart_X.Api.Models.Telemetry;

namespace Smart_X.Api.Services
{
    /// <summary>
    /// Runs once at startup to simulate real hardware: registers four mock
    /// sensors and sends telemetry through the SAME ingestion pipeline that
    /// real devices use, so the seeded data is validated like any other.
    /// TEMP-002 never sends data, so it stays Offline and has an open issue -
    /// this shows off the dashboard's "Attention Required" alert.
    /// </summary>
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

            // 1. Register one sensor per category (plus an offline one).
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

            // Part 2: hydroponics devices used by the Command Stream demo.
            var moistureSensor = _sensorService.RegisterSensor(
                new DTOs.SensorRegistrationRequest
                {
                    DeviceIdentifier = "MOIST-001",
                    MacAddress = "AA:BB:CC:DD:EE:05",
                    DeploymentLocation = "Greenhouse 1 - Bed B",
                    Category = SensorCategory.Environmental
                });

            _sensorService.RegisterSensor(
                new DTOs.SensorRegistrationRequest
                {
                    DeviceIdentifier = "PUMP-001",
                    MacAddress = "AA:BB:CC:DD:EE:06",
                    DeploymentLocation = "Greenhouse 1 - Pump A",
                    Category = SensorCategory.Actuator
                });

            // 2. Push one generic TelemetryPacket<T> of each type through ingestion.
            await _telemetryService.ProcessTelemetryAsync(
                new TelemetryPacket<EnvironmentalTelemetry>
                {
                    DeviceIdentifier = moistureSensor.DeviceIdentifier,
                    Timestamp = DateTime.UtcNow.AddSeconds(-20),
                    Data = new EnvironmentalTelemetry
                    {
                        Temperature = 24.1,
                        Humidity = 55,
                        Pressure = 1010
                    }
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

            // 3. Log an unresolved issue for the offline sensor.
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