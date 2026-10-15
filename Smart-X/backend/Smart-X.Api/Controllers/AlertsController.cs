using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.DataStructures;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    // Read-only views of the real-time structures: /api/alerts
    [ApiController]
    [Route("api/[controller]")]
    public class AlertsController : ControllerBase
    {
        private readonly AlertService _alerts;
        private readonly DisconnectedNodes _disconnectedNodes;
        private readonly TelemetryQueue _telemetryQueue;
        private readonly CriticalAlertQueue _criticalAlerts;
        private readonly SensorTimeline _timeline;
        private readonly ProcessingLog _processingLog;

        public AlertsController(
            AlertService alerts,
            DisconnectedNodes disconnectedNodes,
            TelemetryQueue telemetryQueue,
            CriticalAlertQueue criticalAlerts,
            SensorTimeline timeline,
            ProcessingLog processingLog)
        {
            _processingLog = processingLog;
            _alerts = alerts;
            _disconnectedNodes = disconnectedNodes;
            _telemetryQueue = telemetryQueue;
            _criticalAlerts = criticalAlerts;
            _timeline = timeline;
        }

        // GET /api/alerts - processed alerts, newest first (no duplicates).
        [HttpGet]
        public IActionResult GetAlerts() => Ok(_alerts.GetRecent());

        // GET /api/alerts/processing-log - the order things were processed
        // in (critical alerts vs queued telemetry), newest first.
        [HttpGet("processing-log")]
        public IActionResult GetProcessingLog() => Ok(_processingLog.GetRecent());

        // GET /api/alerts/status - HashSet contents + queue depths.
        [HttpGet("status")]
        public IActionResult GetStatus() => Ok(new
        {
            disconnectedNodes = _disconnectedNodes.GetDisconnected(),
            activeAlertKeys = _disconnectedNodes.GetActiveAlerts(),
            telemetryQueueDepth = _telemetryQueue.Count,
            criticalQueueDepth = _criticalAlerts.Count
        });

        // GET /api/alerts/timeline/TEMP-001 - readings oldest -> newest
        // (from the SortedDictionary, so always in timestamp order).
        [HttpGet("timeline/{deviceIdentifier}")]
        public IActionResult GetTimeline(string deviceIdentifier) =>
            Ok(_timeline.GetTimeline(deviceIdentifier));
    }
}
