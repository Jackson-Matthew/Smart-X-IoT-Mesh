using Smart_X.Api.DataStructures;
using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    // Manual override commands (pump on, relay toggle...).
    // Every command is PUSHED onto the undo stack together with the state
    // the device had before, so Undo can pop it and restore that state.
    public class CommandService
    {
        private readonly DeviceRegistry _registry;
        private readonly CommandUndoStack _undoStack;

        // Current commanded state per device, e.g. "PUMP-001" -> "On".
        private readonly Dictionary<string, string> _states =
            new(StringComparer.OrdinalIgnoreCase);

        private readonly object _lock = new();

        private readonly PredictionEngine _engine;

        public CommandService(
            DeviceRegistry registry,
            CommandUndoStack undoStack,
            PredictionEngine engine)
        {
            _registry = registry;
            _undoStack = undoStack;
            _engine = engine;
        }

        // Returns the stored command, or throws ArgumentException for a bad request.
        public DeviceCommand Execute(
            string deviceIdentifier, string commandName, string newState)
        {
            var sensor = _registry.FindByNodeId(deviceIdentifier)
                ?? throw new ArgumentException(
                    $"Device '{deviceIdentifier}' is not registered.");

            if (sensor.Category != SensorCategory.Actuator)
            {
                throw new ArgumentException(
                    $"Device '{deviceIdentifier}' is not an actuator and cannot be commanded.");
            }

            if (string.IsNullOrWhiteSpace(commandName) || string.IsNullOrWhiteSpace(newState))
            {
                throw new ArgumentException("Command name and new state are required.");
            }

            lock (_lock)
            {
                var command = new DeviceCommand
                {
                    DeviceIdentifier = sensor.DeviceIdentifier,
                    CommandName = commandName,
                    PreviousState = _states.GetValueOrDefault(sensor.DeviceIdentifier, "Off"),
                    NewState = newState
                };

                _states[sensor.DeviceIdentifier] = newState;
                _undoStack.Push(command);

                // The engine learns from every manual command.
                _engine.Record(new UserAction
                {
                    Kind = "Command",
                    DeviceIdentifier = command.DeviceIdentifier,
                    Detail = command.CommandName,
                    Value = command.NewState
                });

                return command;
            }
        }

        // Reverts the most recent command. Returns null if there is nothing to undo.
        public DeviceCommand? UndoLast()
        {
            lock (_lock)
            {
                var command = _undoStack.Undo();

                if (command != null)
                {
                    _states[command.DeviceIdentifier] = command.PreviousState;
                }

                return command;
            }
        }

        public List<DeviceCommand> GetHistory() => _undoStack.GetHistory();

        public Dictionary<string, string> GetStates()
        {
            lock (_lock) { return new Dictionary<string, string>(_states); }
        }
    }
}
