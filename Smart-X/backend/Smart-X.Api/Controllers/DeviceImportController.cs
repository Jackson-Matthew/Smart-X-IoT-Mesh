using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    // POST /api/sensors/import - multipart upload of a .txt device list.
    [ApiController]
    [Route("api/sensors/import")]
    public class DeviceImportController : ControllerBase
    {
        private const long MaxBytes = 1_000_000;   // 1 MB is far more than a device list needs

        private readonly DeviceImportService _import;

        public DeviceImportController(DeviceImportService import)
        {
            _import = import;
        }

        [HttpPost]
        [RequestSizeLimit(MaxBytes)]
        public async Task<IActionResult> Import(IFormFile? file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "Please choose a .txt file." });
            }

            if (!Path.GetExtension(file.FileName).Equals(".txt", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { error = "Only .txt files can be imported." });
            }

            if (file.Length > MaxBytes)
            {
                return BadRequest(new { error = "File is too large (max 1 MB)." });
            }

            await using var stream = file.OpenReadStream();
            var result = await _import.ImportAsync(stream);

            if (result.LinesRead == 0)
            {
                return BadRequest(new { error = "The file contains no device lines." });
            }

            return Ok(result);
        }
    }
}
