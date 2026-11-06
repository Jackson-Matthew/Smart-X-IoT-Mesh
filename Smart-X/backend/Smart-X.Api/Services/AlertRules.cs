using Smart_X.Api.Models;
using Smart_X.Api.Models.Telemetry;

namespace Smart_X.Api.Services
{
    // The thresholds that decide whether a reading is dangerous.
    // Each rule returns (alertType, alert): alert is null when the reading is
    // healthy. The type is returned either way so the caller can CLEAR that
    // alert in the HashSet once the problem goes away.
    public static class AlertRules
    {
        public const double MinMoisture = 20;     // % - critical moisture drop
        public const double MaxTemperature = 50;  // degrees C
        public const double MaxPower = 3000;      // W - severe power spike
        public const double MinVoltage = 200;     // V
        public const double MaxVoltage = 250;     // V

        public static List<(string Type, Alert? Alert)> Evaluate(
            ITelemetryPacket packet)
        {
            var results = new List<(string, Alert?)>();

            switch (packet.Data)
            {
                case EnvironmentalTelemetry env:
                    results.Add(("LowMoisture", env.Humidity < MinMoisture
                        ? Make(packet, "LowMoisture", 1,
                            $"Moisture dropped to {env.Humidity:0.#}% (min {MinMoisture}%).")
                        : null));
                    results.Add(("HighTemperature", env.Temperature > MaxTemperature
                        ? Make(packet, "HighTemperature", 1,
                            $"Temperature reached {env.Temperature:0.#}°C (max {MaxTemperature}°C).")
                        : null));
                    break;

                case PowerConsumptionTelemetry power:
                    results.Add(("PowerSpike", power.Power > MaxPower
                        ? Make(packet, "PowerSpike", 1,
                            $"Power spiked to {power.Power:0.#} W (max {MaxPower} W).")
                        : null));
                    results.Add(("VoltageFault",
                        power.Voltage < MinVoltage || power.Voltage > MaxVoltage
                        ? Make(packet, "VoltageFault", 2,
                            $"Voltage {power.Voltage:0.#} V is outside {MinVoltage}-{MaxVoltage} V.")
                        : null));
                    break;
            }

            return results;
        }

        private static Alert Make(
            ITelemetryPacket packet, string type, int severity, string message) =>
            new()
            {
                DeviceIdentifier = packet.DeviceIdentifier,
                AlertType = type,
                Severity = severity,
                Message = message,
                Timestamp = packet.Timestamp
            };
    }
}
