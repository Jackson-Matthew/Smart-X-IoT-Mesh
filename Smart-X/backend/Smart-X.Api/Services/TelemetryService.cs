using Smart_X.Api.Models;
using Smart_X.Api.Models.Telemetry;


namespace Smart_X.Api.Services
{


    /// <summary>
    /// The DATA INGESTION PIPELINE. Every reading passes through these steps:
    ///   1. Check the packet is complete (device ID and data present).
    ///   2. Look up the registered sensor that sent it.
    ///   3. Check the data type matches the sensor's category.
    ///   4. Mark the sensor Online and record when it was last seen.
    ///   5. Store the full packet in the repository (List).
    ///   6. Extract the raw numbers and add them to the jagged-array history.
    /// </summary>
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

        // Generic method: T is whichever telemetry class arrived, so one
        // method handles environmental, power and actuator data.
        public async Task ProcessTelemetryAsync<T>(
            TelemetryPacket<T> packet)
        {
            // STEP 1 - the packet must be complete.
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

            // STEP 2 - only registered devices may send data.
            var sensor = _sensorService
                .GetSensorByDeviceIdentifier(
                    packet.DeviceIdentifier);

            if (sensor == null)
            {
                throw new InvalidOperationException(
                    $"No registered sensor was found for device " +
                    $"'{packet.DeviceIdentifier}'.");
            }

            // STEP 3 - e.g. a power meter may not send temperature readings.
            if (!IsTelemetryCompatible<T>(sensor.Category))
            {
                throw new InvalidOperationException(
                    $"Telemetry type '{typeof(T).Name}' is not " +
                    $"compatible with sensor category " +
                    $"'{sensor.Category}'.");
            }

            // STEP 4 - receiving data proves the device is alive.
            sensor.IsOnline = true;
            sensor.LastSeen = packet.Timestamp;

            _sensorService.UpdateSensor(sensor);

            // STEP 5 - keep the whole packet so the dashboard can chart it.
            await _telemetryRepository.AddAsync(packet);

            // STEP 6 - store just the numbers as one row in the jagged array.
            var values = ExtractTelemetryValues(packet);

            _telemetryHistory.AddReading(values);
        }

        // typeof(T) tells us, at runtime, which telemetry class T was filled with.
        // Each type is only allowed for its matching sensor category.
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

        // Flattens a packet into a simple double[] (one row of numbers).
        // Rows have different lengths: environmental = 3, power = 4,
        // actuator = 1 - which is exactly why a JAGGED array is used for history.
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