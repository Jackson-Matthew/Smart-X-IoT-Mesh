using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.Models;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IssuesController : ControllerBase
    {
        private readonly IssueService _issueService;
        private readonly SensorService _sensorService;

        public IssuesController(
            IssueService issueService,
            SensorService sensorService)
        {
            _issueService = issueService;
            _sensorService = sensorService;
        }

        [HttpGet]
        public IActionResult GetIssues()
        {
            return Ok(_issueService.GetAllIssues());
        }

        [HttpGet("sensor/{sensorId:guid}")]
        public IActionResult GetSensorIssues(Guid sensorId)
        {
            var sensor = _sensorService.GetSensorById(sensorId);

            if (sensor == null)
            {
                return NotFound(new
                {
                    error = "Sensor was not found."
                });
            }

            return Ok(
                _issueService.GetIssuesForSensor(sensorId));
        }

        [HttpPost]
        public IActionResult ReportIssue(
            [FromBody] ReportedIssue request)
        {
            if (request.SensorId == Guid.Empty)
            {
                return BadRequest(new
                {
                    error = "Sensor ID is required."
                });
            }

            var sensor =
                _sensorService.GetSensorById(request.SensorId);

            if (sensor == null)
            {
                return NotFound(new
                {
                    error = "Sensor was not found."
                });
            }

            if (string.IsNullOrWhiteSpace(request.Description))
            {
                return BadRequest(new
                {
                    error = "Issue description is required."
                });
            }

            var issue = new ReportedIssue
            {
                SensorId = sensor.Id,
                DeviceIdentifier = sensor.DeviceIdentifier,
                Description = request.Description.Trim(),
                Severity = string.IsNullOrWhiteSpace(request.Severity)
                    ? "Medium"
                    : request.Severity.Trim()
            };

            _issueService.AddIssue(issue);

            return Ok(issue);
        }

        [HttpPut("{issueId:guid}/resolve")]
        public IActionResult ResolveIssue(Guid issueId)
        {
            var resolved =
                _issueService.ResolveIssue(issueId);

            if (!resolved)
            {
                return NotFound(new
                {
                    error = "Issue was not found."
                });
            }

            return Ok(new
            {
                message = "Issue resolved successfully."
            });
        }
    }
}