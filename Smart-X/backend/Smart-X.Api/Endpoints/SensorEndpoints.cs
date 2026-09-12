using Smart_X.Api.DTOs;
using Smart_X.Api.Services;


namespace SmartX.Api.Endpoints;

public static class SensorEndpoints
{
    public static void MapSensorEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/sensors")
            .WithTags("Sensors");

        group.MapPost(
    "/",
    (
        SensorRegistrationRequest request,
        SensorService sensorService,
        ValidationService validationService) =>
    {
        var validation = validationService.ValidateSensor(request);

        if (!validation.IsValid)
        {
            return Results.BadRequest(new
            {
                message = "Sensor registration failed validation.",
                errors = validation.Errors
            });
        }

        var sensor = sensorService.RegisterSensor(request);

        return Results.Created(
            $"/api/sensors/{sensor.Id}",
            sensor);
    });

        group.MapGet("/", (SensorService service) =>
        {
            return Results.Ok(service.GetAllSensors());
        });

        group.MapGet("/{id:guid}", (Guid id, SensorService service) =>
        {
            var sensor = service.GetSensorById(id);

            return sensor is null
                ? Results.NotFound()
                : Results.Ok(sensor);
        });
    }
}