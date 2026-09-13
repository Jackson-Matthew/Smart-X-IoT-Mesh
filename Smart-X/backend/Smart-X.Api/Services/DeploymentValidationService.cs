using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    public class DeploymentValidationService
    {
        public bool ValidateTree(DeploymentNode? node)
        {
            // Base case
            if (node == null)
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(node.Name) ||
                string.IsNullOrWhiteSpace(node.NodeType))
            {
                return false;
            }

            // Recursive case
            foreach (var child in node.Children)
            {
                if (!ValidateTree(child))
                {
                    return false;
                }
            }

            return true;
        }
    }
}