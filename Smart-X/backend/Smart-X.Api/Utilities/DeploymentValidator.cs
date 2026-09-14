using Smart_X.Api.Models;

namespace Smart_X.Api.Utilities;

/// <summary>
/// Alternative recursive validator that, instead of stopping at the first
/// problem, walks the WHOLE tree and collects every error in a list, noting
/// how deep each problem is (depth 0 = root, 1 = child, 2 = grandchild...).
/// </summary>
public class DeploymentValidator
{
    public bool ValidateDeploymentTree(
        DeploymentNode node,
        List<string> errors,
        int depth = 0)
    {
        // Base case: nothing to check.
        if (node is null)
        {
            errors.Add("Deployment node cannot be null.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(node.Name))
        {
            errors.Add($"Deployment node at depth {depth} has no name.");
        }

        if (string.IsNullOrWhiteSpace(node.NodeType))
        {
            errors.Add(
                $"Deployment node '{node.Name}' has no node type.");
        }

        // Recursive case: the method calls itself for each child node,
        // passing depth + 1. Leaf nodes have no children, which ends recursion.
        foreach (var child in node.Children)
        {
            ValidateDeploymentTree(
                child,
                errors,
                depth + 1);
        }

        return errors.Count == 0;
    }
}