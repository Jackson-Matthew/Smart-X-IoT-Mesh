using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.Models;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    [ApiController]
    [Route("api/sensors/{sensorId:guid}/media")]
    public class SensorMediaController : ControllerBase
    {
        private readonly SensorService _sensorService;
        private readonly IWebHostEnvironment _environment;

        private static readonly string[] AllowedExtensions =
        [
            ".txt",
            ".log",
            ".jpg",
            ".jpeg",
            ".png"
        ];

        private const long MaxFileSize = 10 * 1024 * 1024;

        public SensorMediaController(
            SensorService sensorService,
            IWebHostEnvironment environment)
        {
            _sensorService = sensorService;
            _environment = environment;
        }

        [HttpPost("upload")]
        [RequestSizeLimit(MaxFileSize)]
        public async Task<IActionResult> Upload(
            Guid sensorId,
            IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new
                {
                    error = "A file is required."
                });
            }

            if (file.Length > MaxFileSize)
            {
                return BadRequest(new
                {
                    error = "File size cannot exceed 10 MB."
                });
            }

            var sensor = _sensorService.GetSensorById(sensorId);

            if (sensor == null)
            {
                return NotFound(new
                {
                    error = "Sensor was not found."
                });
            }

            var extension =
                Path.GetExtension(file.FileName)
                    .ToLowerInvariant();

            if (!AllowedExtensions.Contains(extension))
            {
                return BadRequest(new
                {
                    error =
                        "Only TXT, LOG, JPG, JPEG and PNG files are allowed."
                });
            }

            var uploadsFolder = Path.Combine(
                _environment.ContentRootPath,
                "uploads");

            Directory.CreateDirectory(uploadsFolder);

            var storedFileName =
                $"{Guid.NewGuid():N}{extension}";

            var filePath = Path.Combine(
                uploadsFolder,
                storedFileName);

            await using var stream =
                new FileStream(
                    filePath,
                    FileMode.CreateNew,
                    FileAccess.Write,
                    FileShare.None,
                    81920,
                    useAsync: true);

            await file.CopyToAsync(stream);

            var media = new SensorMedia
            {
                OriginalFileName = Path.GetFileName(file.FileName),
                StoredFileName = storedFileName,
                ContentType = file.ContentType,
                FileSize = file.Length
            };

            sensor.Media.Add(media);

            _sensorService.UpdateSensor(sensor);

            return Ok(media);
        }

        [HttpGet]
        public IActionResult GetMedia(Guid sensorId)
        {
            var sensor = _sensorService.GetSensorById(sensorId);

            if (sensor == null)
            {
                return NotFound(new
                {
                    error = "Sensor was not found."
                });
            }

            return Ok(sensor.Media);
        }
    }
}