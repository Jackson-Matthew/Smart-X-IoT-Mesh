namespace Smart_X.Api.Services
{
    public class TelemetryHistory
    {
        private double[][] _history = [];

        public void AddReading(double[] reading)
        {
            ArgumentNullException.ThrowIfNull(reading);

            var updatedHistory = new double[_history.Length + 1][];

            for (int i = 0; i < _history.Length; i++)
            {
                updatedHistory[i] = _history[i];
            }

            updatedHistory[^1] = reading;

            _history = updatedHistory;
        }

        public double[][] GetHistory()
        {
            return _history
                .Select(reading => reading.ToArray())
                .ToArray();
        }

        public int Count => _history.Length;
    }
}