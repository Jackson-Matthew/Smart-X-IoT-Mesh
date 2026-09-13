using Smart_X.Api.Models;
using Smart_X.Api.Models.Telemetry;


namespace Smart_X.Api.Services
{


    public class TelemetryService : ITelemetryService
    {
        private readonly ITelemetryRepository _telemetryRepository;
        private readonly SensorService _sensorService;
        private readonly TelemetryHistory _telemetryHistory;

        public TelemetryService(
            ITelemetryRepository telemetryRepository,
            SensorService sensorService,
            TelemetryHistory telemetryHistory)
        {
            _telemetryRepository = telemetryRepository;
            _sensorService = sensorService;
            _telemetryHistory = telemetryHistory;
        }

        public async Task ProcessTelemetryAsync<T>(
            TelemetryPacket<T> packet)
        {
            ArgumentNullException.ThrowIfNull(packet);

            if (string.IsNullOrWhiteSpace(packet.DeviceIdentifier))
            {
                throw new ArgumentException(
                    "Device identifier is required.",
                    nameof(packet));
            }

            if (packet.Data == null)
            {
                throw new ArgumentException(
                    "Telemetry data is required.",
                    nameof(packet));
            }

            var sensor = _sensorService
                .GetSensorByDeviceIdentifier(
                    packet.DeviceIdentifier);

            if (sensor == null)
            {
                throw new InvalidOperationException(
                    $"No registered sensor was found for device " +
                    $"'{packet.DeviceIdentifier}'.");
            }

            if (!IsTelemetryCompatible<T>(sensor.Category))
            {
                throw new InvalidOperationException(
                    $"Telemetry type '{typeof(T).Name}' is not " +
                    $"compatible with sensor category " +
                    $"'{sensor.Category}'.");
            }

            sensor.IsOnline = true;
            sensor.LastSeen = packet.Timestamp;

            _sensorService.UpdateSensor(sensor);

            await _telemetryRepository.AddAsync(packet);
            var values = ExtractTelemetryValues(packet);

            _telemetryHistory.AddReading(values);
        }

        private static bool IsTelemetryCompatible<T>(
            SensorCategory category)
        {
            return typeof(T) switch
            {
                var type when type ==
                    typeof(EnvironmentalTelemetry) =>
                    category == SensorCategory.Environmental,

                var type when type ==
                    typeof(PowerConsumptionTelemetry) =>
                    category == SensorCategory.PowerConsumption,

                var type when type ==
                    typeof(ActuatorTelemetry) =>
                    category == SensorCategory.Actuator,

                _ => false
            };
        }

        private static double[] ExtractTelemetryValues<T>(
    TelemetryPacket<T> packet)
        {
            if (packet.Data is EnvironmentalTelemetry environmental)
            {
                return
                [
                    environmental.Temperature,
            environmental.Humidity,
            environmental.Pressure ?? 0
                ];
            }

            if (packet.Data is PowerConsumptionTelemetry power)
            {
                return
                [
                    power.Voltage,
            power.Current,
            power.Power,
            power.EnergyConsumed
                ];
            }

            if (packet.Data is ActuatorTelemetry actuator)
            {
                return
                [
                    actuator.Value ?? 0
                ];
            }

            return [];
        }
    }
}