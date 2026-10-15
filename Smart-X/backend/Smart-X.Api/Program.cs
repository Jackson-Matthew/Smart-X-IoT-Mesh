using Smart_X.Api.DataStructures;
using Smart_X.Api.Services;
using SmartX.Api.Endpoints;
using Smart_X.Api.Utilities;
using System.Text.Json.Serialization;
namespace Smart_X.Api
{

    // Entry point of the Smart-X Data Ingestion Gateway.
    // Startup happens in three stages:
    // Register services (the "workers" the API needs).
    // Build the app and seed it with mock sensors and telemetry.
    // Map the URLs (endpoints) and start listening for requests.
  
    public class Program
    {
        public static void Main(string[] args)
        {
            // STAGE 1 - CONFIGURE SERVICES
            var builder = WebApplication.CreateBuilder(args);

            // Send enums as readable text ("Environmental") instead of numbers (0).
            builder.Services.ConfigureHttpJsonOptions(options =>
            {
                options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });

            // Enables the [ApiController] classes in the Controllers folder.
            builder.Services.AddControllers();

            // Swagger generates a test page for every endpoint.
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // Dependency injection: each service is created ONCE (singleton) and
            // shared by every request. Because data is stored in memory, singletons
            // make sure every request sees the same list of sensors and telemetry.
            // Part 2 data structures: one shared instance of each so every
            // request works on the same queues, stack, dictionaries and sets.
            builder.Services.AddSingleton<DeviceRegistry>();
            builder.Services.AddSingleton<TelemetryQueue>();
            builder.Services.AddSingleton<CriticalAlertQueue>();
            builder.Services.AddSingleton<CommandUndoStack>();
            builder.Services.AddSingleton<SensorTimeline>();
            builder.Services.AddSingleton<DisconnectedNodes>();
            builder.Services.AddSingleton<AlertService>();

            builder.Services.AddSingleton<SensorService>();
            builder.Services.AddSingleton<ValidationService>();
            builder.Services.AddSingleton<DeploymentValidator>();
            builder.Services.AddSingleton<ITelemetryService, TelemetryService>();
            builder.Services.AddSingleton<ITelemetryRepository, TelemetryRepository>();
            builder.Services.AddSingleton<TelemetryHistory>();
            builder.Services.AddSingleton<DeploymentValidationService>();
            builder.Services.AddSingleton<SensorAggregationService>();
            builder.Services.AddSingleton<IssueService>();
            builder.Services.AddSingleton<SeedDataService>();
            builder.Services.AddOpenApi();

            // CORS: browsers block calls between different addresses by default.
            // This policy allows the React dashboard (port 5173) to call this API.
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("SmartXClient", policy =>
                {
                    policy
                        .WithOrigins("http://localhost:5173")
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
            });

            var app = builder.Build();

            // Fill the gateway with mock sensors, telemetry and an issue so the
            // dashboard has data to show the moment it opens (simulated hardware).
            using (var scope = app.Services.CreateScope())
            {
                var seedDataService = scope.ServiceProvider
                    .GetRequiredService<SeedDataService>();

                seedDataService.SeedAsync().GetAwaiter().GetResult();
            }

            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseCors("SmartXClient");

            // Health check: the dashboard calls this to show "Gateway: Online".
            app.MapGet("/api/health", () =>
            {
                return Results.Ok(new
                {
                    status = "online",
                    service = "Smart-X Data Ingestion Gateway",
                    version = "1.0"
                });
            });



            // Minimal API endpoints for sensor registration (/api/sensors).
            app.MapSensorEndpoints();

            // Controller endpoints (telemetry, media, issues, history, deployment).
            app.MapControllers();

            // Start listening for HTTP requests.
            app.Run();
        }
    }
}
