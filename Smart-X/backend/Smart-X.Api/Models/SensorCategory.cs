using System.Text.Json.Serialization;
namespace Smart_X.Api.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum SensorCategory
    {
        Environmental,
        PowerConsumption,
        Actuator,
    }
}
