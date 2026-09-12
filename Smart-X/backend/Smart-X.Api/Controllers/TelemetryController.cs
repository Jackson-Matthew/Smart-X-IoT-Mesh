using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.Models;
using Smart_X.Api.Models.Telemetry;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TelemetryController : ControllerBase
    {
        private readonly ITelemetryService _telemetryService;
        private readonly ITelemetryRepository _telemetryRepository;

        public TelemetryController(
            ITelemetryService telemetryService,
            ITelemetryRepository telemetryRepository)
        {
            _telemetryService = telemetryService;
            _telemetryRepository = telemetryRepository;
        }

        [HttpPost("environmental")]
        public async Task<IActionResult> SubmitEnvironmentalTelemetry(
    [FromBody] TelemetryPacket<EnvironmentalTelemetry> packet)
        {
            return await ProcessTelemetry(packet);
        }

        [HttpPost("power")]
        public async Task<IActionResult> SubmitPowerTelemetry(
            [FromBody] TelemetryPacket<PowerConsumptionTelemetry> packet)
        {
            return await ProcessTelemetry(packet);
        }

        [HttpPost("actuator")]
        public async Task<IActionResult> SubmitActuatorTelemetry(
            [FromBody] TelemetryPacket<ActuatorTelemetry> packet)
        {
            return await ProcessTelemetry(packet);
        }

        private async Task<IActionResult> ProcessTelemetry<T>(
            TelemetryPacket<T> packet)
        {
            try
            {
                await _telemetryService.ProcessTelemetryAsync(packet);

                return Ok(new
                {
                    message = "Telemetry processed successfully.",
                    packetId = packet.PacketId
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    error = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    error = ex.Message
                });
            }
        }
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