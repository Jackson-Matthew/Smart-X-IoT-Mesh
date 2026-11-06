using System.Net.NetworkInformation;
using Smart_X.Api.DTOs;
using Smart_X.Api.Models;

namespace Smart_X.Api.Services;

/// <summary>
/// Checks a sensor registration before it is saved.
/// Instead of stopping at the first problem, it collects every error in a
/// List&lt;string&gt; so the user can fix them all at once.
/// </summary>
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

        // Rejects category values that are not in the SensorCategory enum.
        if (!Enum.IsDefined(request.Category))
        {
            errors.Add("Invalid sensor category.");
        }

        return new ValidationResult(
            errors.Count == 0,
            errors
        );
    }

    // Uses .NET's built-in PhysicalAddress parser, after removing ":" or "-",
    // to confirm the MAC address is real hexadecimal hardware address.
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

// A record is a small, read-only data class: valid or not, plus the reasons.
public record ValidationResult(
    bool IsValid,
    List<string> Errors
);
