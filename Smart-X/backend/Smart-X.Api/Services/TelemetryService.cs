using Smart_X.Api.DataStructures;
using Smart_X.Api.Models;
using Smart_X.Api.Models.Telemetry;


namespace Smart_X.Api.Services
{

    // The DATA INGESTION PIPELINE. Every reading passes through these steps:
    //   1. Check the packet is complete (device ID and data present).
    //   2. Look up the registered sensor that sent it.
    //   3. Check the data type matches the sensor's category.
    //   4. Mark the sensor Online and record when it was last seen.
    //   5. Store the full packet in the repository (List).
    //   6. Extract the raw numbers and add them to the jagged-array history.
    public class TelemetryService : ITelemetryService
    {
        private readonly ITelemetryRepository _telemetryRepository;
        private readonly SensorService _sensorService;
        private readonly TelemetryHistory _telemetryHistory;

        // Part 2 data structures.
        private readonly TelemetryQueue _telemetryQueue;
        private readonly CriticalAlertQueue _criticalAlerts;
        private readonly SensorTimeline _timeline;
        private readonly DisconnectedNodes _disconnectedNodes;
        private readonly AlertService _alertService;
        private readonly ProcessingLog _processingLog;

        // Only one thread drains the queues at a time, so FIFO order is kept
        // even when many devices POST at once.
        private readonly object _drainLock = new();

        public TelemetryService(
            ITelemetryRepository telemetryRepository,
            SensorService sensorService,
            TelemetryHistory telemetryHistory,
            TelemetryQueue telemetryQueue,
            CriticalAlertQueue criticalAlerts,
            SensorTimeline timeline,
            DisconnectedNodes disconnectedNodes,
            AlertService alertService,
            ProcessingLog processingLog)
        {
            _processingLog = processingLog;
            _telemetryRepository = telemetryRepository;
            _sensorService = sensorService;
            _telemetryHistory = telemetryHistory;
            _telemetryQueue = telemetryQueue;
            _criticalAlerts = criticalAlerts;
            _timeline = timeline;
            _disconnectedNodes = disconnectedNodes;
            _alertService = alertService;
        }

        // Generic method: T is whichever telemetry class arrived, so one
        // method handles environmental, power and actuator data.
        public async Task ProcessTelemetryAsync<T>(
            TelemetryPacket<T> packet)
        {
           //check if the packet must is complete.
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

            // only registered devices may send data.
            var sensor = _sensorService
                .GetSensorByDeviceIdentifier(
                    packet.DeviceIdentifier);

            if (sensor == null)
            {
                throw new InvalidOperationException(
                    $"No registered sensor was found for device " +
                    $"'{packet.DeviceIdentifier}'.");
            }

            // power meter may not send temperature readings.
            if (!IsTelemetryCompatible<T>(sensor.Category))
            {
                throw new InvalidOperationException(
                    $"Telemetry type '{typeof(T).Name}' is not " +
                    $"compatible with sensor category " +
                    $"'{sensor.Category}'.");
            }

            // receiving data proves the device is alive.
            sensor.IsOnline = true;
            sensor.LastSeen = packet.Timestamp;

            _sensorService.UpdateSensor(sensor);

            // the node is talking again, so it is no longer "disconnected"
            // (this also lets a future disconnect alert fire again).
            if (_disconnectedNodes.MarkReconnected(sensor.DeviceIdentifier))
            {
                _disconnectedNodes.ClearAlert(
                    sensor.DeviceIdentifier, "Disconnected");
            }

            // Normal path: the packet joins the back of the FIFO queue.
            _telemetryQueue.Enqueue(packet);

            // Alert path: dangerous readings go on the PRIORITY queue. The
            // HashSet only lets the first alert for a device/problem through.
            foreach (var (alertType, alert) in AlertRules.Evaluate(packet))
            {
                if (alert == null)
                {
                    // Reading is healthy again - allow this alert to fire later.
                    _disconnectedNodes.ClearAlert(
                        packet.DeviceIdentifier, alertType);
                }
                else if (_disconnectedNodes.TryRaiseAlert(
                    packet.DeviceIdentifier, alertType))
                {
                    // Remember how long the line was when this alert arrived,
                    // to show later how far it jumped the queue.
                    alert.QueuedAt = DateTime.UtcNow;
                    alert.BacklogAtArrival = _telemetryQueue.Count;
                    _criticalAlerts.Enqueue(alert);
                }
            }

            // The packet is now only QUEUED. The background TelemetryProcessor
            // works the queues (see ProcessPendingAsync).
            await Task.CompletedTask;
        }

        // Called by the background worker every 100 ms.
        // Critical alerts are processed FIRST, ahead of any waiting telemetry.
        // Then a limited batch of the normal queue is processed oldest-first (FIFO).
        public async Task<DrainResult> ProcessPendingAsync(int maxTelemetry)
        {
            var toStore = new List<ITelemetryPacket>();
            var alerts = 0;
            int remaining;

            lock (_drainLock)
            {
                while (_criticalAlerts.TryDequeue(out var alert))
                {
                    alerts++;
                    _alertService.Add(alert!);

                    var waitedMs = (DateTime.UtcNow - alert!.QueuedAt).TotalMilliseconds;

                    _processingLog.Add(
                        "Critical alert",
                        $"{alert.AlertType} on {alert.DeviceIdentifier} processed FIRST. " +
                        $"{alert.BacklogAtArrival} readings were already waiting; " +
                        $"it waited {waitedMs:0} ms.");
                }

                while (toStore.Count < maxTelemetry &&
                       _telemetryQueue.TryDequeue(out var queued))
                {
                    toStore.Add(queued!);

                    // sorted timeline + jagged-array history.
                    _timeline.Add(queued!);
                    _telemetryHistory.AddReading(
                        ExtractTelemetryValues(queued!));
                }

                remaining = _telemetryQueue.Count;

                // Only log batches while there is a backlog, otherwise the
                // log would fill with routine traffic.
                if (toStore.Count > 0 && remaining > 0)
                {
                    _processingLog.Add(
                        "Telemetry batch",
                        $"Processed {toStore.Count} readings in order (FIFO). " +
                        $"{remaining} still waiting.");
                }
            }

            // keep the whole packet so the dashboard can chart it.
            foreach (var packet in toStore)
            {
                await _telemetryRepository.AddAsync(packet);
            }

            return new DrainResult(alerts, toStore.Count, remaining);
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
        private static double[] ExtractTelemetryValues(
    ITelemetryPacket packet)
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