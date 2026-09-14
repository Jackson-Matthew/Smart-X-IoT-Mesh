namespace Smart_X.Api.Services
{

    // ARRAYS: sequential history of raw telemetry values.
    // Data structure: a JAGGED array, double[][] - an "array of arrays".
    // Each row is one reading and rows can be different lengths:
    //   (environmental: 3 values)
    //   (power: 4 values)
    //   (actuator: 1 value)
    // A rectangular [] array would force every row to the same length 


    public class TelemetryHistory
    {
        private double[][] _history = [];

        public void AddReading(double[] reading)
        {
            ArgumentNullException.ThrowIfNull(reading);

            // Arrays have a fixed size, so to add a row we:
            // 1. create a new outer array one slot bigger,
            var updatedHistory = new double[_history.Length + 1][];

            // 2. copy every existing row across,
            for (int i = 0; i < _history.Length; i++)
            {
                updatedHistory[i] = _history[i];
            }

            // 3. put the new reading in the last slot (^1 means "last"),
            updatedHistory[^1] = reading;

            // 4. replace the old array with the new one.
            _history = updatedHistory;
        }

        // Returns a deep copy (each row copied too) so callers cannot
        // change the stored history.
        public double[][] GetHistory()
        {
            return _history
                .Select(reading => reading.ToArray())
                .ToArray();
        }

        // Number of rows (readings) in the history.
        public int Count => _history.Length;
    }
}