using System.Text.Json.Serialization;
namespace Smart_X.Api.Models
{
    // The three allowed sensor types. An enum stops invalid categories, and the
    // converter sends them as text ("Actuator") in JSON instead of numbers.
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum SensorCategory
    {
        Environmental,
        PowerConsumption,
        Actuator,
    }
}
