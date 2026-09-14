using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.Models;
using Smart_X.Api.Models.Telemetry;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{

    // The "front door" for sensor data (DATA INGESTION).
    // Devices POST their readings here; the dashboard GETs them back.
    // Base URL: /api/Telemetry

    [ApiController]
    [Route("api/[controller]")]
    public class TelemetryController : ControllerBase
    {
        private readonly ITelemetryService _telemetryService;
        private readonly ITelemetryRepository _telemetryRepository;

        // Services are passed in by dependency injection (registered in Program.cs).
        public TelemetryController(
            ITelemetryService telemetryService,
            ITelemetryRepository telemetryRepository)
        {
            _telemetryService = telemetryService;
            _telemetryRepository = telemetryRepository;
        }

        // One endpoint per sensor type. Each one fills in T with a different
        // class, but they all reuse the same generic TelemetryPacket<T>.

        // POST /api/Telemetry/environmental  (T = EnvironmentalTelemetry)
        [HttpPost("environmental")]
        public async Task<IActionResult> SubmitEnvironmentalTelemetry(
    [FromBody] TelemetryPacket<EnvironmentalTelemetry> packet)
        {
            return await ProcessTelemetry(packet);
        }

        // POST /api/Telemetry/power  (T = PowerConsumptionTelemetry)
        [HttpPost("power")]
        public async Task<IActionResult> SubmitPowerTelemetry(
            [FromBody] TelemetryPacket<PowerConsumptionTelemetry> packet)
        {
            return await ProcessTelemetry(packet);
        }

        // POST /api/Telemetry/actuator  (T = ActuatorTelemetry)
        [HttpPost("actuator")]
        public async Task<IActionResult> SubmitActuatorTelemetry(
            [FromBody] TelemetryPacket<ActuatorTelemetry> packet)
        {
            return await ProcessTelemetry(packet);
        }

        // Generic helper shared by all three endpoints, so the success/error
        // handling is written once instead of three times.
        private async Task<IActionResult> ProcessTelemetry<T>(
            TelemetryPacket<T> packet)
        {
            try
            {
                // "await" lets the server handle other requests while this runs.
                await _telemetryService.ProcessTelemetryAsync(packet);

                return Ok(new
                {
                    message = "Telemetry processed successfully.",
                    packetId = packet.PacketId
                });
            }
            // Bad or missing data -> 400 Bad Request with a clear message.
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    error = ex.Message
                });
            }
            // Unknown device or wrong telemetry type for the sensor -> 400.
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    error = ex.Message
                });
            }
        }
        // GET /api/Telemetry/TEMP-001 - every packet stored for one device.
        // The dashboard polls this every 3 seconds to draw the live chart.
        [HttpGet("{deviceIdentifier}")]
        public async Task<IActionResult> GetTelemetry(
            string deviceIdentifier)
        {
            var telemetry =
                await _telemetryRepository
                    .GetByDeviceAsync(deviceIdentifier);

            return Ok(telemetry);
        }
    }
}