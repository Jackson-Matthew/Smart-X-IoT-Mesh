using Smart_X.Api.DataStructures;
using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    // Background worker: every few seconds it checks each device's LastSeen.
    // A device that has been silent too long is marked disconnected. The
    // HashSet in DisconnectedNodes makes sure that happens ONCE per outage,
    // so the dashboard never shows duplicate "disconnected" warnings.
    public class DisconnectMonitor : BackgroundService
    {
        private static readonly TimeSpan CheckEvery = TimeSpan.FromSeconds(10);
        private static readonly TimeSpan SilenceLimit = TimeSpan.FromSeconds(60);

        private readonly DeviceRegistry _registry;
        private readonly DisconnectedNodes _disconnectedNodes;
        private readonly CriticalAlertQueue _criticalAlerts;

        public DisconnectMonitor(
            DeviceRegistry registry,
            DisconnectedNodes disconnectedNodes,
            CriticalAlertQueue criticalAlerts)
        {
            _registry = registry;
            _disconnectedNodes = disconnectedNodes;
            _criticalAlerts = criticalAlerts;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(CheckEvery);

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                CheckForSilentDevices();
            }
        }

        private void CheckForSilentDevices()
        {
            var now = DateTime.UtcNow;

            foreach (var sensor in _registry.GetAll())
            {
                // Never reported -> nothing to compare against.
                if (sensor.LastSeen is null || now - sensor.LastSeen.Value < SilenceLimit)
                {
                    continue;
                }

                // false = we already know about this outage, so skip it.
                if (!_disconnectedNodes.MarkDisconnected(sensor.DeviceIdentifier))
                {
                    continue;
                }

                sensor.IsOnline = false;

                _criticalAlerts.Enqueue(new Alert
                {
                    DeviceIdentifier = sensor.DeviceIdentifier,
                    AlertType = "Disconnected",
                    Severity = 2,
                    Message = $"No telemetry for over {SilenceLimit.TotalSeconds:0} seconds."
                });

                // The background TelemetryProcessor picks the alert up from
                // the priority queue on its next tick.
            }
        }
    }
}
