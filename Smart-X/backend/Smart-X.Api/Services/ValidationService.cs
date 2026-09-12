using System.Net.NetworkInformation;
using Smart_X.Api.DTOs;
using Smart_X.Api.Models;

namespace Smart_X.Api.Services;

public class ValidationService
{
    public ValidationResult ValidateSensor(SensorRegistrationRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.DeviceIdentifier))
        {
            errors.Add("Device identifier is required.");
        }

        if (!IsValidMacAddress(request.MacAddress))
        {
            errors.Add("A valid MAC address is required.");
        }

        if (string.IsNullOrWhiteSpace(request.DeploymentLocation))
        {
            errors.Add("Deployment location is required.");
        }

        if (!Enum.IsDefined(request.Category))
        {
            errors.Add("Invalid sensor category.");
        }

        return new ValidationResult(
            errors.Count == 0,
            errors
        );
    }

    private static bool IsValidMacAddress(string macAddress)
    {
        if (string.IsNullOrWhiteSpace(macAddress))
        {
            return false;
        }

        return PhysicalAddress.TryParse(
            macAddress.Replace(":", "").Replace("-", ""),
            out _
        );
    }
}

public record ValidationResult(
    bool IsValid,
    List<string> Errors
);