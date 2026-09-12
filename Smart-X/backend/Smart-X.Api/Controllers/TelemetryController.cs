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
            await _telemetryService.ProcessTelemetryAsync(packet);

            return Ok(new
            {
                message = "Environmental telemetry processed successfully.",
                packetId = packet.PacketId
            });
        }

        [HttpPost("power")]
        public async Task<IActionResult> SubmitPowerTelemetry(
            [FromBody] TelemetryPacket<PowerConsumptionTelemetry> packet)
        {
            await _telemetryService.ProcessTelemetryAsync(packet);

            return Ok(new
            {
                message = "Power telemetry processed successfully.",
                packetId = packet.PacketId
            });
        }

        [HttpPost("actuator")]
        public async Task<IActionResult> SubmitActuatorTelemetry(
            [FromBody] TelemetryPacket<ActuatorTelemetry> packet)
        {
            await _telemetryService.ProcessTelemetryAsync(packet);

            return Ok(new
            {
                message = "Actuator telemetry processed successfully.",
                packetId = packet.PacketId
            });
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