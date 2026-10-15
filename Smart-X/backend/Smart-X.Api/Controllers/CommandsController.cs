using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    // Manual override commands: /api/commands
    [ApiController]
    [Route("api/[controller]")]
    public class CommandsController : ControllerBase
    {
        private readonly CommandService _commands;

        public CommandsController(CommandService commands)
        {
            _commands = commands;
        }

        public record CommandRequest(
            string DeviceIdentifier, string CommandName, string NewState);

        // POST /api/commands  { deviceIdentifier, commandName, newState }
        [HttpPost]
        public IActionResult Issue([FromBody] CommandRequest request)
        {
            try
            {
                var command = _commands.Execute(
                    request.DeviceIdentifier, request.CommandName, request.NewState);

                return Ok(command);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // POST /api/commands/undo - never fails; says so if nothing to undo.
        [HttpPost("undo")]
        public IActionResult Undo()
        {
            var command = _commands.UndoLast();

            return Ok(new
            {
                undone = command != null,
                message = command == null
                    ? "Nothing to undo."
                    : $"Reverted '{command.CommandName}' on {command.DeviceIdentifier} to '{command.PreviousState}'.",
                command
            });
        }

        // GET /api/commands/history - newest first.
        [HttpGet("history")]
        public IActionResult History() => Ok(_commands.GetHistory());

        // GET /api/commands/states - current state of each commanded device.
        [HttpGet("states")]
        public IActionResult States() => Ok(_commands.GetStates());
    }
}
