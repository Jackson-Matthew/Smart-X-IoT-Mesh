using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    /// <summary>
    /// RECURSION: validates a nested deployment tree such as
    ///   Facility A -> Zone 1 -> Sub-Zone B -> Node
    /// A method is recursive when it calls itself. Every node's children are
    /// smaller trees of the same shape, so the same check works at every level,
    /// no matter how deep the tree goes.
    /// Used by DeploymentController (POST /api/Deployment/validate).
    /// </summary>
    public class DeploymentValidationService
    {
        public bool ValidateTree(DeploymentNode? node)
        {
            // BASE CASES - stop without calling ourselves again.
            // A missing node is invalid.
            if (node == null)
            {
                return false;
            }

            // Every node must have a name and a type (e.g. "Zone").
            if (string.IsNullOrWhiteSpace(node.Name) ||
                string.IsNullOrWhiteSpace(node.NodeType))
            {
                return false;
            }

            // RECURSIVE CASE - validate each child by calling this same method.
            // If any child (or grandchild...) is invalid, the whole tree fails.
            // A node with no children skips the loop, which ends the recursion.
            foreach (var child in node.Children)
            {
                if (!ValidateTree(child))
                {
                    return false;
                }
            }

            // This node and everything below it passed.
            return true;
        }
    }
}