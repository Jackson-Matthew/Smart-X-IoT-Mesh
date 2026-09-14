using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{

    // RECURSION: validates a nested deployment tree such as
    //   Facility A -> Zone 1 -> Sub-Zone B -> Node
    // A method is recursive when it calls itself. Every node's children are
    // smaller trees of the same shape, so the same check works at every level,
    // no matter how deep the tree goes.
    // Used by DeploymentController (POST /api/Deployment/validate).
    public class DeploymentValidationService
    {
        public bool ValidateTree(DeploymentNode? node)
        {
           
            if (node == null)
            {
                return false;
            }

  
            if (string.IsNullOrWhiteSpace(node.Name) ||
                string.IsNullOrWhiteSpace(node.NodeType))
            {
                return false;
            }

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