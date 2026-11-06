using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TelemetryHistoryController : ControllerBase
    {
        private readonly TelemetryHistory _telemetryHistory;

        public TelemetryHistoryController(
            TelemetryHistory telemetryHistory)
        {
            _telemetryHistory = telemetryHistory;
        }

        // GET /api/TelemetryHistory - returns the jagged array as JSON
        // (an array of number arrays) plus how many readings it holds.
        [HttpGet]
        public IActionResult GetHistory()
        {
            return Ok(new
            {
                readingCount = _telemetryHistory.Count,
                history = _telemetryHistory.GetHistory()
            });
        }
    }
}