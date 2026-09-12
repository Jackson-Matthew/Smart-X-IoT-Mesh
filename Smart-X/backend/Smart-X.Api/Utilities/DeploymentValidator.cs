using Smart_X.Api.Models;

namespace Smart_X.Api.Utilities;

public class DeploymentValidator
{
    public bool ValidateDeploymentTree(
        DeploymentNode node,
        List<string> errors,
        int depth = 0)
    {
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

        //method calls itself for each child node in the tree
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