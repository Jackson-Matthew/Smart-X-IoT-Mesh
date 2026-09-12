using Smart_X.Api.Services;
using SmartX.Api.Endpoints;
using System.Text.Json.Serialization;
namespace Smart_X.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.ConfigureHttpJsonOptions(options =>
            {
                options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });

            builder.Services.AddSingleton<SensorService>();
            builder.Services.AddOpenApi();

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

            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
            }

            app.UseHttpsRedirection();

            app.UseCors("SmartXClient");

            app.MapGet("/api/health", () =>
            {
                return Results.Ok(new
                {
                    status = "online",
                    service = "Smart-X Data Ingestion Gateway",
                    version = "1.0"
                });
            });

            app.MapSensorEndpoints();

            app.Run();
        }
    }
}
