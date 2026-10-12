using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.Models;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SensorAggregationController : ControllerBase
    {
        private readonly SensorAggregationService _aggregationService;

        public SensorAggregationController(
            SensorAggregationService aggregationService)
        {
            _aggregationService = aggregationService;
        }

        // POST /api/SensorAggregation - send two readings, get their total back.
        [HttpPost]
        public IActionResult Aggregate(
            [FromBody] SensorReadingPair request)
        {
            var result = _aggregationService.Aggregate(
                request.First,
                request.Second);

            return Ok(result);
        }
    }

    public class SensorReadingPair
    {
        public SensorReading First { get; set; } = new();

        public SensorReading Second { get; set; } = new();
    }
}