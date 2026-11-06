using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.Models;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    // Suggested Actions / Automated Insights: /api/insights
    [ApiController]
    [Route("api/[controller]")]
    public class InsightsController : ControllerBase
    {
        private readonly PredictionEngine _engine;

        public InsightsController(PredictionEngine engine)
        {
            _engine = engine;
        }

        public record SearchRecord(string Query);

        // GET /api/insights - suggestions + live insights + learned patterns.
        [HttpGet]
        public IActionResult Get() => Ok(_engine.BuildResponse());

        // POST /api/insights/search - the dashboard reports each search so the
        // engine can learn from it. Commands and alerts are recorded server-side.
        [HttpPost("search")]
        public IActionResult RecordSearch([FromBody] SearchRecord request)
        {
            var query = request.Query?.Trim() ?? string.Empty;

            if (query.Length < 2)
            {
                return BadRequest(new { error = "Search text is too short to record." });
            }

            _engine.Record(new UserAction { Kind = "Search", Detail = query });
            return Ok(new { recorded = true });
        }
    }
}
