namespace Smart_X.Api.Models
{
    /// <summary>
    /// One level of a deployment tree (Facility, Zone, Sub-Zone or Node).
    /// It contains a list of child nodes of the SAME type - this
    /// self-referencing shape is what makes recursion a natural fit.
    /// </summary>
    public class DeploymentNode
    {
        public string Name { get; set; } = string.Empty;

        public string NodeType { get; set; } = string.Empty;

        public List<DeploymentNode> Children { get; set; } = [];
    }
}
