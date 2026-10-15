using Smart_X.Api.DataStructures;
using Smart_X.Api.DTOs;
using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    // Reads a .txt list of IoT devices and registers each valid line.
    //
    // File format - one device per line, comma (or | or tab) separated:
    //     DeviceId, MAC address, Location, Category
    //     SOIL-101, AA:BB:CC:00:01:01, Greenhouse 2 - Bed A, Environmental
    // Blank lines and lines starting with # are ignored. Bad lines do not
    // stop the import: they are reported back with the reason.
    public class DeviceImportService
    {
        private readonly SensorService _sensorService;
        private readonly ValidationService _validation;
        private readonly DeviceRegistry _registry;

        public DeviceImportService(
            SensorService sensorService,
            ValidationService validation,
            DeviceRegistry registry)
        {
            _sensorService = sensorService;
            _validation = validation;
            _registry = registry;
        }

        public async Task<DeviceImportResult> ImportAsync(Stream content)
        {
            var result = new DeviceImportResult();

            using var reader = new StreamReader(content);
            var lineNumber = 0;

            while (await reader.ReadLineAsync() is { } rawLine)
            {
                lineNumber++;
                var line = rawLine.Trim();

                if (line.Length == 0 || line.StartsWith('#'))
                {
                    continue;
                }

                result.LinesRead++;

                var parsed = TryParse(line, out var request, out var parseError);

                if (!parsed)
                {
                    result.Skipped.Add(new SkippedLine(lineNumber, line, parseError));
                    continue;
                }

                var validation = _validation.ValidateSensor(request);

                if (!validation.IsValid)
                {
                    result.Skipped.Add(new SkippedLine(
                        lineNumber, line, string.Join(" ", validation.Errors)));
                    continue;
                }

                // Dictionary lookups: duplicates are caught instantly.
                if (_registry.FindByNodeId(request.DeviceIdentifier) != null)
                {
                    result.Skipped.Add(new SkippedLine(
                        lineNumber, line, "A device with this ID is already registered."));
                    continue;
                }

                if (_registry.FindByMac(request.MacAddress) != null)
                {
                    result.Skipped.Add(new SkippedLine(
                        lineNumber, line, "A device with this MAC address is already registered."));
                    continue;
                }

                result.Imported.Add(_sensorService.RegisterSensor(request));
            }

            return result;
        }

        private static bool TryParse(
            string line, out SensorRegistrationRequest request, out string error)
        {
            request = new SensorRegistrationRequest();
            error = string.Empty;

            var parts = line
                .Split([',', '|', '\t'], StringSplitOptions.TrimEntries)
                .ToList();

            if (parts.Count < 4)
            {
                error = "Expected 4 fields: DeviceId, MAC, Location, Category.";
                return false;
            }

            // First = ID, second = MAC, last = category, everything between
            // is the location (so a location may itself contain a comma).
            var category = parts[^1];

            if (!TryParseCategory(category, out var parsedCategory))
            {
                error = $"Unknown category '{category}'. Use Environmental, PowerConsumption or Actuator.";
                return false;
            }

            request = new SensorRegistrationRequest
            {
                DeviceIdentifier = parts[0],
                MacAddress = parts[1],
                DeploymentLocation = string.Join(", ", parts.Skip(2).Take(parts.Count - 3)),
                Category = parsedCategory
            };

            return true;
        }

        // Friendly spellings: "power", "Power Consumption", "environment"...
        private static bool TryParseCategory(string text, out SensorCategory category)
        {
            var key = text.Replace(" ", "").Replace("_", "").ToLowerInvariant();

            switch (key)
            {
                case "environmental" or "environment":
                    category = SensorCategory.Environmental;
                    return true;
                case "powerconsumption" or "power":
                    category = SensorCategory.PowerConsumption;
                    return true;
                case "actuator":
                    category = SensorCategory.Actuator;
                    return true;
                default:
                    category = default;
                    return false;
            }
        }
    }

    public record SkippedLine(int LineNumber, string Text, string Reason);

    public class DeviceImportResult
    {
        public int LinesRead { get; set; }

        public List<Sensor> Imported { get; set; } = [];

        public List<SkippedLine> Skipped { get; set; } = [];
    }
}
