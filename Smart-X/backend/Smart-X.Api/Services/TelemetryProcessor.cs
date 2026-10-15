namespace Smart_X.Api.Services
{
    // Background worker that empties the queues at a steady pace.
    //
    // Why this exists: the API can RECEIVE readings faster than it can
    // PROCESS them. Receiving is just "put it in the queue"; this worker
    // processes a limited batch every tick. When many devices report at
    // once a backlog builds in the FIFO queue, and that is exactly when the
    // priority queue matters: a critical alert is handled on the very next
    // tick, ahead of every reading still waiting.
    public class TelemetryProcessor : BackgroundService
    {
        private static readonly TimeSpan Tick = TimeSpan.FromMilliseconds(100);

        // 5 packets per 100 ms = about 50 readings per second.
        public const int BatchSize = 5;

        private readonly ITelemetryService _telemetry;

        public TelemetryProcessor(ITelemetryService telemetry)
        {
            _telemetry = telemetry;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(Tick);

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await _telemetry.ProcessPendingAsync(BatchSize);
                }
                catch (Exception)
                {
                    // One bad packet must never stop the worker.
                }
            }
        }
    }
}
