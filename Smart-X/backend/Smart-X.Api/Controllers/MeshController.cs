using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.DataStructures;
using Smart_X.Api.Models;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    // PILLAR 3: Network Topology & Mesh Routing  (/api/mesh)
    [ApiController]
    [Route("api/[controller]")]
    public class MeshController : ControllerBase
    {
        private readonly MeshTopologyService _mesh;
        private readonly TelemetryHistoryIndex _history;
        private readonly DeviceRegistry _registry;

        public MeshController(
            MeshTopologyService mesh,
            TelemetryHistoryIndex history,
            DeviceRegistry registry)
        {
            _mesh = mesh;
            _history = history;
            _registry = registry;
        }

        // GET /api/mesh/topology - the whole graph plus live status and the MST.
        [HttpGet("topology")]
        public IActionResult GetTopology()
        {
            var mst = _mesh.CurrentMst();
            var bfs = _mesh.Traverse("bfs").ToDictionary(s => s.Node, StringComparer.OrdinalIgnoreCase);
            var mstKeys = mst.Edges.Select(EdgeKey).ToHashSet();

            var nodes = _mesh.Graph.Nodes.Select(id =>
            {
                var sensor = _registry.FindByNodeId(id);
                var pos = _mesh.PositionOf(id);
                bool isGateway = id.Equals(MeshTopologyService.GatewayId, StringComparison.OrdinalIgnoreCase);
                bool up = _mesh.IsUp(id);
                bool reachable = bfs.ContainsKey(id);

                // up + reachable = connected; up but no path = isolated; else down.
                string status = !up ? "Down" : reachable ? "Connected" : "Isolated";

                return new
                {
                    id,
                    mac = isGateway ? MeshTopologyService.GatewayMac : sensor?.MacAddress ?? "",
                    location = isGateway ? "Central gateway" : sensor?.DeploymentLocation ?? "",
                    category = isGateway ? "Gateway" : sensor?.Category.ToString() ?? "",
                    x = pos.X,
                    y = pos.Y,
                    isGateway,
                    status,
                    hops = reachable ? bfs[id].Hops : (int?)null,
                    readings = isGateway ? 0 : _history.CountFor(id)
                };
            }).OrderBy(n => n.id).ToList();

            var edges = _mesh.Graph.Edges.Select(e => new
            {
                from = e.From,
                to = e.To,
                powerCost = e.PowerCost,
                active = _mesh.IsUp(e.From) && _mesh.IsUp(e.To),
                inMst = mstKeys.Contains(EdgeKey(e))
            });

            double activeLinkCost = _mesh.Graph.Edges
                .Where(e => _mesh.IsUp(e.From) && _mesh.IsUp(e.To))
                .Sum(e => e.PowerCost);

            return Ok(new
            {
                gateway = MeshTopologyService.GatewayId,
                nodes,
                edges,
                summary = new
                {
                    total = nodes.Count - 1,
                    connected = nodes.Count(n => !n.isGateway && n.status == "Connected"),
                    down = nodes.Count(n => n.status == "Down"),
                    isolated = nodes.Count(n => n.status == "Isolated"),
                    mstCost = mst.TotalCost,
                    mstLinks = mst.Edges.Count,
                    activeLinkCost,
                    activeLinks = _mesh.Graph.Edges.Count(e => _mesh.IsUp(e.From) && _mesh.IsUp(e.To)),
                    totalReadings = _history.TotalReadings
                }
            });
        }

        // POST /api/mesh/nodes/{id}/status  { "down": true } - simulate a node
        // failure (or recovery) and watch the network heal itself.
        [HttpPost("nodes/{id}/status")]
        public IActionResult SetStatus(string id, [FromBody] StatusRequest request)
        {
            return _mesh.SetDown(id, request.Down)
                ? Ok(new { id, down = request.Down })
                : BadRequest(new { error = "Unknown node, or the gateway cannot be taken down." });
        }

        // GET /api/mesh/traverse?mode=bfs|dfs - every device still connected to
        // the gateway, which ones are down, and where traffic can hop instead.
        [HttpGet("traverse")]
        public IActionResult Traverse([FromQuery] string mode = "bfs")
        {
            var steps = _mesh.Traverse(mode);
            var reachable = steps.Select(s => s.Node).ToHashSet(StringComparer.OrdinalIgnoreCase);

            var down = _mesh.DownNodes()
                .Select(id => new
                {
                    id,
                    hopVia = _mesh.HopOptionsAround(id)
                })
                .ToList();

            var isolated = _mesh.Graph.Nodes
                .Where(n => _mesh.IsUp(n) && !reachable.Contains(n))
                .OrderBy(n => n)
                .ToList();

            return Ok(new
            {
                mode = mode.ToLowerInvariant() == "dfs" ? "dfs" : "bfs",
                visitOrder = steps,
                connectedCount = steps.Count - 1,
                down,
                isolated,
                failover = _mesh.Failover()
            });
        }

        // GET /api/mesh/mst - Prim's minimum spanning tree.
        [HttpGet("mst")]
        public IActionResult GetMst()
        {
            var mst = _mesh.CurrentMst();

            return Ok(new
            {
                algorithm = "Prim (binary min-heap)",
                edges = mst.Edges.Select(e => new { from = e.From, to = e.To, powerCost = e.PowerCost }),
                totalCost = mst.TotalCost,
                heapPushes = mst.HeapPushes,
                heapPops = mst.HeapPops
            });
        }

        // GET /api/mesh/route/{idOrMac} - routing path for one node, found by
        // node ID or MAC address, 
        [HttpGet("route/{idOrMac}")]
        public IActionResult GetRoute(string idOrMac)
        {
            var node = ResolveNode(idOrMac);

            if (node is null)
            {
                return NotFound(new { error = $"No mesh node with ID or MAC '{idOrMac}'." });
            }

            var sensor = _registry.FindByNodeId(node);
            var mst = _mesh.CurrentMst();
            var path = MeshTopologyService.PathToGateway(mst, node);
            bool up = _mesh.IsUp(node);

            var links = new List<object>();

            if (path is not null)
            {
                for (int i = 0; i < path.Count - 1; i++)
                {
                    links.Add(new { from = path[i], to = path[i + 1], powerCost = _mesh.LinkCost(path[i], path[i + 1]) });
                }
            }

            double? mstCost = path is null ? null : _mesh.PathCost(path);

            return Ok(new
            {
                node,
                mac = node.Equals(MeshTopologyService.GatewayId, StringComparison.OrdinalIgnoreCase)
                    ? MeshTopologyService.GatewayMac
                    : sensor?.MacAddress,
                status = !up ? "Down" : path is null ? "Isolated" : "Connected",
                path,
                hops = path is null ? (int?)null : path.Count - 1,
                links,
                mstCost,
                hopVia = up ? [] : _mesh.HopOptionsAround(node)
            });
        }

        // GET /api/mesh/history/{idOrMac}?from=...&to=... - AVL range query.
        [HttpGet("history/{idOrMac}")]
        public IActionResult GetHistory(
            string idOrMac,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int limit = 500)
        {
            var node = ResolveNode(idOrMac);

            if (node is null)
            {
                return NotFound(new { error = $"No mesh node with ID or MAC '{idOrMac}'." });
            }

            var end = (to ?? DateTime.UtcNow).ToUniversalTime();
            var start = (from ?? end.AddHours(-2)).ToUniversalTime();

            var result = _history.Query(node, start, end);

            // The tree returns oldest -> newest; the page wants the latest
            // `limit` rows, so keep the tail (the full count is still reported).
            var rows = result.Readings.Count > limit
                ? result.Readings.Skip(result.Readings.Count - limit).ToList()
                : result.Readings;

            return Ok(new
            {
                node,
                from = start,
                to = end,
                matched = result.Readings.Count,
                returned = rows.Count,
                totalStored = result.TotalStored,
                nodesVisited = result.NodesVisited,
                treeHeight = result.TreeHeight,
                rotations = result.Rotations,
                treeMicroseconds = result.TreeMicroseconds,
                linearScanMicroseconds = result.LinearScanMicroseconds,
                readings = rows.Select(r => new
                {
                    deviceIdentifier = r.DeviceIdentifier,
                    timestamp = r.Timestamp,
                    telemetryType = r.TelemetryType,
                    data = r.Data
                })
            });
        }

        // Accepts "TEMP-001" or "aa:bb:cc:dd:ee:01".
        private string? ResolveNode(string idOrMac)
        {
            if (_mesh.IsMeshNode(idOrMac))
            {
                return _mesh.Graph.Nodes.First(n => n.Equals(idOrMac, StringComparison.OrdinalIgnoreCase));
            }

            if (idOrMac.Equals(MeshTopologyService.GatewayMac, StringComparison.OrdinalIgnoreCase))
            {
                return MeshTopologyService.GatewayId;
            }

            var byMac = _registry.FindByMac(idOrMac);
            return byMac is not null && _mesh.IsMeshNode(byMac.DeviceIdentifier)
                ? byMac.DeviceIdentifier
                : null;
        }

        // The same link has two ends, so sort them to get one key per link.
        private static string EdgeKey(MeshEdge e) =>
            string.Compare(e.From, e.To, StringComparison.OrdinalIgnoreCase) < 0
                ? $"{e.From}|{e.To}"
                : $"{e.To}|{e.From}";

        public record StatusRequest(bool Down);
    }
}
