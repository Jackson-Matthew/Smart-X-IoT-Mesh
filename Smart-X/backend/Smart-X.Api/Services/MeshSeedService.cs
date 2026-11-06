using Smart_X.Api.DataStructures;
using Smart_X.Api.DTOs;
using Smart_X.Api.Models;
using Smart_X.Api.Models.Telemetry;

namespace Smart_X.Api.Services
{
    // Part 3 mock data (simulated hardware, like the Part 1 seed):
    //   1. adds more ESP32 sensors so the mesh is big enough to be interesting,
    //   2. wires every sensor into the mesh graph with weighted wireless links,
    //   3. back-fills 24 hours of timestamped telemetry per node into the AVL
    //      history index so range queries have something real to search.
    public class MeshSeedService
    {
        private readonly SensorService _sensors;
        private readonly MeshTopologyService _mesh;
        private readonly TelemetryHistoryIndex _history;

        public MeshSeedService(
            SensorService sensors,
            MeshTopologyService mesh,
            TelemetryHistoryIndex history)
        {
            _sensors = sensors;
            _mesh = mesh;
            _history = history;
        }

        // (id, mac suffix, location, category, x, y)
        private static readonly (string Id, string Mac, string Location, SensorCategory Category, double X, double Y)[] ExtraSensors =
        [
            ("TEMP-003",  "AA:BB:CC:DD:EE:07", "Greenhouse 2 - North Wall",   SensorCategory.Environmental,    60, 12),
            ("TEMP-004",  "AA:BB:CC:DD:EE:08", "Greenhouse 2 - East Wall",    SensorCategory.Environmental,    92, 45),
            ("MOIST-002", "AA:BB:CC:DD:EE:09", "Greenhouse 1 - Bed C",        SensorCategory.Environmental,    66, 50),
            ("MOIST-003", "AA:BB:CC:DD:EE:0A", "Greenhouse 2 - Bed A",        SensorCategory.Environmental,    82, 68),
            ("POWER-002", "AA:BB:CC:DD:EE:0B", "Building B - Sub-board",      SensorCategory.PowerConsumption, 68, 86),
            ("ACT-002",   "AA:BB:CC:DD:EE:0C", "Greenhouse 2 - Vents",        SensorCategory.Actuator,         80, 28),
            ("PUMP-002",  "AA:BB:CC:DD:EE:0D", "Greenhouse 2 - Pump B",       SensorCategory.Actuator,         90, 90),
        ];

        // Positions of the Part 1 / Part 2 sensors on the drawing.
        private static readonly Dictionary<string, (double X, double Y)> ExistingPositions = new()
        {
            ["TEMP-001"]  = (24, 28),
            ["POWER-001"] = (24, 72),
            ["ACT-001"]   = (38, 50),
            ["TEMP-002"]  = (40, 15),
            ["MOIST-001"] = (52, 32),
            ["PUMP-001"]  = (52, 70),
        };

        // Wireless links and their power cost in mW per hop.
        private static readonly (string A, string B, double Cost)[] Links =
        [
            (MeshTopologyService.GatewayId, "TEMP-001", 18),
            (MeshTopologyService.GatewayId, "ACT-001", 14),
            (MeshTopologyService.GatewayId, "POWER-001", 20),
            ("TEMP-001", "ACT-001", 9),
            ("POWER-001", "ACT-001", 11),
            ("TEMP-001", "TEMP-002", 12),
            ("TEMP-002", "MOIST-001", 10),
            ("TEMP-001", "MOIST-001", 15),
            ("ACT-001", "MOIST-001", 13),
            ("ACT-001", "PUMP-001", 12),
            ("POWER-001", "PUMP-001", 14),
            ("MOIST-001", "TEMP-003", 9),
            ("TEMP-002", "TEMP-003", 8),
            ("MOIST-001", "MOIST-002", 11),
            ("PUMP-001", "MOIST-002", 13),
            ("PUMP-001", "POWER-002", 16),
            ("TEMP-003", "ACT-002", 12),
            ("MOIST-002", "ACT-002", 10),
            ("MOIST-002", "MOIST-003", 12),
            ("POWER-002", "MOIST-003", 9),
            ("ACT-002", "TEMP-004", 11),
            ("MOIST-003", "TEMP-004", 10),
            ("MOIST-003", "PUMP-002", 8),
            ("POWER-002", "PUMP-002", 11),
            ("TEMP-004", "PUMP-002", 14),
        ];

        public void Seed()
        {
            // 1. More sensors (skipped if they already exist).
            foreach (var s in ExtraSensors)
            {
                if (_sensors.GetSensorByDeviceIdentifier(s.Id) is not null)
                {
                    continue;
                }

                var sensor = _sensors.RegisterSensor(new SensorRegistrationRequest
                {
                    DeviceIdentifier = s.Id,
                    MacAddress = s.Mac,
                    DeploymentLocation = s.Location,
                    Category = s.Category
                });

                sensor.IsOnline = true;
                sensor.LastSeen = DateTime.UtcNow;
            }

            // 2. The graph: vertices first (with drawing positions), then edges.
            _mesh.AddNode(MeshTopologyService.GatewayId, 8, 50);

            foreach (var kv in ExistingPositions)
            {
                _mesh.AddNode(kv.Key, kv.Value.X, kv.Value.Y);
            }

            foreach (var s in ExtraSensors)
            {
                _mesh.AddNode(s.Id, s.X, s.Y);
            }

            foreach (var link in Links)
            {
                _mesh.AddLink(link.A, link.B, link.Cost);
            }

            // TEMP-002 has never reported (Part 1 seed leaves it offline), so the
            // mesh starts with it down: the topology page shows a failure at once.
            _mesh.SetDown("TEMP-002", true);

            // 3. 24 hours of history, one reading every 2 minutes per node.
            var random = new Random(7312);
            var now = DateTime.UtcNow;

            foreach (var sensor in _sensors.GetAllSensors())
            {
                if (!_mesh.IsMeshNode(sensor.DeviceIdentifier))
                {
                    continue;
                }

                // TEMP-002 went silent 3 hours ago.
                var newest = sensor.DeviceIdentifier == "TEMP-002"
                    ? now.AddHours(-3)
                    : now;

                for (var t = now.AddHours(-24); t <= newest; t = t.AddMinutes(2))
                {
                    _history.Add(BuildPacket(sensor, t, now, random));
                }
            }
        }

        // A smooth daily curve plus a little noise so charts look like real sensors.
        private static ITelemetryPacket BuildPacket(
            Sensor sensor, DateTime time, DateTime now, Random random)
        {
            double hours = (time - now).TotalHours;
            double wave = Math.Sin((hours / 24.0) * 2 * Math.PI);
            double noise = random.NextDouble() - 0.5;

            switch (sensor.Category)
            {
                case SensorCategory.PowerConsumption:
                    double power = 1100 + wave * 250 + noise * 60;
                    return new TelemetryPacket<PowerConsumptionTelemetry>
                    {
                        DeviceIdentifier = sensor.DeviceIdentifier,
                        Timestamp = time,
                        Data = new PowerConsumptionTelemetry
                        {
                            Voltage = Math.Round(230 + noise * 4, 1),
                            Current = Math.Round(power / 230, 2),
                            Power = Math.Round(power, 1),
                            EnergyConsumed = Math.Round(14 + (hours + 24) * 0.6, 2)
                        }
                    };

                case SensorCategory.Actuator:
                    double output = Math.Clamp(55 + wave * 30 + noise * 8, 0, 100);
                    return new TelemetryPacket<ActuatorTelemetry>
                    {
                        DeviceIdentifier = sensor.DeviceIdentifier,
                        Timestamp = time,
                        Data = new ActuatorTelemetry
                        {
                            State = output > 20 ? "Running" : "Idle",
                            Value = Math.Round(output, 1)
                        }
                    };

                default:
                    return new TelemetryPacket<EnvironmentalTelemetry>
                    {
                        DeviceIdentifier = sensor.DeviceIdentifier,
                        Timestamp = time,
                        Data = new EnvironmentalTelemetry
                        {
                            Temperature = Math.Round(23 + wave * 4 + noise * 0.8, 2),
                            Humidity = Math.Round(52 + wave * -10 + noise * 3, 2),
                            Pressure = Math.Round(1012 + noise * 2, 1)
                        }
                    };
            }
        }
    }
}
