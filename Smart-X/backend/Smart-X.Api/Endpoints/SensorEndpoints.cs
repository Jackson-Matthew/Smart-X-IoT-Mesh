using Smart_X.Api.DTOs;
using Smart_X.Api.Services;


namespace SmartX.Api.Endpoints;

/// <summary>
/// Minimal API endpoints for registering and reading sensors.
/// All URLs are grouped under /api/sensors.
/// </summary>
public static class SensorEndpoints
{
    // "this WebApplication app" makes this an extension method, so Program.cs
    // can simply call app.MapSensorEndpoints().
    public static void MapSensorEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/sensors")
            .WithTags("Sensors");

        // POST /api/sensors - register a new sensor.
        // ASP.NET turns the JSON body into a SensorRegistrationRequest and
        // injects the services automatically.
        group.MapPost(
    "/",
    (
        SensorRegistrationRequest request,
        SensorService sensorService,
        ValidationService validationService) =>
    {
        // Server-side validation: never trust the client, check again here.
        var validation = validationService.ValidateSensor(request);

        if (!validation.IsValid)
        {
            // 400 Bad Request with the list of reasons it failed.
            return Results.BadRequest(new
            {
                message = "Sensor registration failed validation.",
                errors = validation.Errors
            });
        }

        var sensor = sensorService.RegisterSensor(request);

        // 201 Created, plus the URL where the new sensor can be fetched.
        return Results.Created(
            $"/api/sensors/{sensor.Id}",
            sensor);
    });

        // GET /api/sensors - return every registered sensor.
        group.MapGet("/", (SensorService service) =>
        {
            return Results.Ok(service.GetAllSensors());
        });

        // GET /api/sensors/{id} - return one sensor, or 404 if it does not exist.
        group.MapGet("/{id:guid}", (Guid id, SensorService service) =>
        {
            var sensor = service.GetSensorById(id);

            return sensor is null
                ? Results.NotFound()
                : Results.Ok(sensor);
        });
    }
}
