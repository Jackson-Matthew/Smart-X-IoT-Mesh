namespace Smart_X.Api.Models
{
    public class DeploymentNode
    {
        public string Name { get; set; } = string.Empty;

        public string NodeType { get; set; } = string.Empty;

        public List<DeploymentNode> Children { get; set; } = [];
    }
}
