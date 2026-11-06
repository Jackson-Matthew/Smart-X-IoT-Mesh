import { useCallback, useEffect, useMemo, useState } from "react";

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { Icon, type IconName } from "../components/Icons";
import {
    getHistory,
    getRoute,
    getTopology,
    getTraversal,
    setNodeDown,
    type HistoryResult,
    type RouteInfo,
    type Topology,
    type Traversal,
} from "../services/meshApi";
import "../mesh.css";

// Which fields of each category are drawn on the history chart.
const CHART_LINES: Record<string, { key: string; label: string; color: string }[]> = {
    Environmental: [
        { key: "temperature", label: "Temperature (°C)", color: "#2d3748" },
        { key: "humidity", label: "Moisture (%)", color: "#4fd1c5" },
    ],
    PowerConsumption: [{ key: "power", label: "Power (W)", color: "#4fd1c5" }],
    Actuator: [{ key: "value", label: "Output (%)", color: "#4fd1c5" }],
};

const STATUS_COLOR = {
    Connected: "#38b2ac",
    Down: "#e53e3e",
    Isolated: "#dd8b1b",
} as const;

// Drawing area: node positions arrive as 0-100, the SVG is 1000 x 640.
const SX = 10;
const SY = 6.4;

const RANGES = [
    { label: "Last hour", hours: 1 },
    { label: "Last 2 hours", hours: 2 },
    { label: "Last 6 hours", hours: 6 },
    { label: "Last 24 hours", hours: 24 },
];

// datetime-local wants "YYYY-MM-DDTHH:mm" in LOCAL time.
function toLocalInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

function StatCard({
    icon,
    label,
    value,
    note,
}: {
    icon: IconName;
    label: string;
    value: string | number;
    note?: string;
}) {
    return (
        <div className="mt-stat">
            <div>
                <p className="mt-stat-label">{label}</p>
                <p className="mt-stat-value">{value}</p>
                {note && <p className="mt-stat-note">{note}</p>}
            </div>
            <span className="mt-stat-icon">
                <Icon name={icon} size={20} />
            </span>
        </div>
    );
}

function PathChain({ path }: { path: string[] }) {
    return (
        <div className="mt-chain">
            {path.map((id, i) => (
                <span key={id + i} className="mt-chain-item">
                    <span className="mt-chip">{id}</span>
                    {i < path.length - 1 && <span className="mt-arrow">→</span>}
                </span>
            ))}
        </div>
    );
}

function MeshTopologyPage() {
    const [topology, setTopology] = useState<Topology | null>(null);
    const [traversal, setTraversal] = useState<Traversal | null>(null);
    const [mode, setMode] = useState<"bfs" | "dfs">("bfs");
    const [error, setError] = useState("");

    const [selected, setSelected] = useState("");
    const [search, setSearch] = useState("");
    const [route, setRoute] = useState<RouteInfo | null>(null);
    const [routeError, setRouteError] = useState("");

    const [showAllLinks, setShowAllLinks] = useState(true);

    const [rangeFrom, setRangeFrom] = useState(() =>
        toLocalInput(new Date(Date.now() - 2 * 3600_000)),
    );
    const [rangeTo, setRangeTo] = useState(() => toLocalInput(new Date()));
    const [history, setHistory] = useState<HistoryResult | null>(null);
    const [historyError, setHistoryError] = useState("");
    const [busy, setBusy] = useState(false);

    // ----- loading -----

    const refresh = useCallback(async () => {
        try {
            const [t, tr] = await Promise.all([getTopology(), getTraversal(mode)]);
            setTopology(t);
            setTraversal(tr);
            setError("");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Cannot reach the gateway.");
        }
    }, [mode]);

    useEffect(() => {
        // Initial load + keep the map fresh while the tab stays mounted.
        const first = setTimeout(refresh, 0);
        const timer = setInterval(refresh, 8000);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, [refresh]);

    const loadRoute = useCallback(async (idOrMac: string) => {
        try {
            setRoute(await getRoute(idOrMac));
            setRouteError("");
        } catch (e) {
            setRoute(null);
            setRouteError(e instanceof Error ? e.message : "Route lookup failed.");
        }
    }, []);

    const runQuery = useCallback(
        async (nodeId: string, from: string, to: string) => {
            if (!nodeId) return;

            const fromDate = new Date(from);
            const toDate = new Date(to);

            if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
                setHistoryError("Choose a valid start and end time.");
                return;
            }

            if (fromDate > toDate) {
                setHistoryError("The start time must be before the end time.");
                return;
            }

            try {
                setHistory(await getHistory(nodeId, fromDate, toDate));
                setHistoryError("");
            } catch (e) {
                setHistory(null);
                setHistoryError(e instanceof Error ? e.message : "Query failed.");
            }
        },
        [],
    );

    // Selecting a node (map click, search box or dropdown) loads its route
    // and its historical log together.
    function selectNode(idOrMac: string) {
        const node = topology?.nodes.find(
            (n) =>
                n.id.toLowerCase() === idOrMac.toLowerCase() ||
                n.mac.toLowerCase() === idOrMac.toLowerCase(),
        );

        if (!node) {
            setRoute(null);
            setRouteError(`No mesh node with ID or MAC "${idOrMac}".`);
            return;
        }

        setSelected(node.id);
        setSearch(node.id);
        void loadRoute(node.id);
        void runQuery(node.id, rangeFrom, rangeTo);
    }

    function applyRange(hours: number) {
        const to = new Date();
        const from = new Date(to.getTime() - hours * 3600_000);
        const f = toLocalInput(from);
        const t = toLocalInput(to);
        setRangeFrom(f);
        setRangeTo(t);
        void runQuery(selected, f, t);
    }

    async function toggleFailure(id: string, down: boolean) {
        setBusy(true);
        try {
            await setNodeDown(id, down);
            await refresh();
            if (selected) await loadRoute(selected);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not change the node.");
        } finally {
            setBusy(false);
        }
    }

    // ----- derived data -----

    const nodeById = useMemo(
        () => new Map(topology?.nodes.map((n) => [n.id, n]) ?? []),
        [topology],
    );

    const routeLinks = useMemo(() => {
        const keys = new Set<string>();
        const path = route?.path ?? [];
        for (let i = 0; i < path.length - 1; i++) {
            keys.add([path[i], path[i + 1]].sort().join("|"));
        }
        return keys;
    }, [route]);

    const selectedNode = selected ? nodeById.get(selected) : undefined;

    const chartLines = CHART_LINES[selectedNode?.category ?? ""] ?? [];

    const chartData = useMemo(
        () =>
            (history?.readings ?? []).map((r) => ({
                time: new Date(r.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                ...r.data,
            })),
        [history],
    );

    const tableColumns = useMemo(
        () => Object.keys(history?.readings[0]?.data ?? {}),
        [history],
    );

    if (!topology) {
        return (
            <div className="mt-page">
                <div className="mt-card">
                    {error ? (
                        <p className="mt-error">{error}</p>
                    ) : (
                        <p className="mt-muted">Loading the mesh network…</p>
                    )}
                </div>
            </div>
        );
    }

    const { summary } = topology;
    const saving =
        summary.activeLinkCost > 0
            ? Math.round((1 - summary.mstCost / summary.activeLinkCost) * 100)
            : 0;

    return (
        <div className="mt-page">
            {error && <p className="mt-error">{error}</p>}

            {/* ---------- headline numbers ---------- */}
            <div className="mt-stats">
                <StatCard
                    icon="mesh"
                    label="Connected nodes"
                    value={`${summary.connected} / ${summary.total}`}
                    note="reachable from the gateway (BFS)"
                />
                <StatCard
                    icon="offline"
                    label="Down / isolated"
                    value={`${summary.down} / ${summary.isolated}`}
                    note="down = failed, isolated = cut off"
                />
                <StatCard
                    icon="bolt"
                    label="MST power cost"
                    value={`${summary.mstCost} mW`}
                    note={`${summary.mstLinks} links kept awake, ${saving}% less than all ${summary.activeLinks} links`}
                />
                <StatCard
                    icon="stack"
                    label="Readings indexed"
                    value={summary.totalReadings.toLocaleString()}
                    note="stored in per-node AVL trees"
                />
            </div>

            {/* ---------- map + route tracker ---------- */}
            <div className="mt-grid">
                <section className="mt-card mt-map-card">
                    <div className="mt-card-head">
                        <div>
                            <h2>Mesh network map</h2>
                            <p className="mt-muted">
                                Click a node to track its route. Teal links are the
                                minimum spanning tree (Prim); grey links are spare
                                paths the network can heal onto.
                            </p>
                        </div>
                        <label className="mt-check">
                            <input
                                type="checkbox"
                                checked={showAllLinks}
                                onChange={(e) => setShowAllLinks(e.target.checked)}
                            />
                            Show spare links
                        </label>
                    </div>

                    <svg viewBox="0 0 1000 640" className="mt-svg" role="img"
                         aria-label="IoT mesh network graph">
                        {topology.edges
                            .filter((e) => showAllLinks || e.inMst)
                            .map((e) => {
                                const a = nodeById.get(e.from);
                                const b = nodeById.get(e.to);
                                if (!a || !b) return null;

                                const key = [e.from, e.to].sort().join("|");
                                const onRoute = routeLinks.has(key);

                                let stroke = "#cbd5e0";
                                let width = 2;
                                let dash: string | undefined;

                                if (!e.active) {
                                    stroke = "#feb2b2";
                                    dash = "6 6";
                                } else if (e.inMst) {
                                    stroke = "#4fd1c5";
                                    width = 4;
                                }

                                if (onRoute) {
                                    stroke = "#dd6b20";
                                    width = 6;
                                    dash = undefined;
                                }

                                return (
                                    <g key={key}>
                                        <line
                                            x1={a.x * SX} y1={a.y * SY}
                                            x2={b.x * SX} y2={b.y * SY}
                                            stroke={stroke}
                                            strokeWidth={width}
                                            strokeDasharray={dash}
                                            strokeLinecap="round"
                                        />
                                        <text
                                            x={((a.x + b.x) / 2) * SX}
                                            y={((a.y + b.y) / 2) * SY - 4}
                                            className="mt-edge-label"
                                        >
                                            {e.powerCost}
                                        </text>
                                    </g>
                                );
                            })}

                        {topology.nodes.map((n) => {
                            const cx = n.x * SX;
                            const cy = n.y * SY;
                            const isSel = n.id === selected;

                            return (
                                <g
                                    key={n.id}
                                    className="mt-node"
                                    onClick={() => !n.isGateway && selectNode(n.id)}
                                >
                                    {isSel && (
                                        <circle cx={cx} cy={cy} r={26} className="mt-ring" />
                                    )}
                                    {n.isGateway ? (
                                        <rect
                                            x={cx - 20} y={cy - 20} width={40} height={40} rx={8}
                                            fill="#1a202c"
                                        />
                                    ) : (
                                        <circle
                                            cx={cx} cy={cy} r={17}
                                            fill={STATUS_COLOR[n.status]}
                                            stroke="#fff" strokeWidth={3}
                                        />
                                    )}
                                    <text x={cx} y={cy + 38} className="mt-node-label">
                                        {n.id}
                                    </text>
                                    <title>
                                        {`${n.id} · ${n.status}\n${n.location}\n${n.mac}`}
                                    </title>
                                </g>
                            );
                        })}
                    </svg>

                    <div className="mt-legend">
                        <span><i style={{ background: STATUS_COLOR.Connected }} />Connected</span>
                        <span><i style={{ background: STATUS_COLOR.Down }} />Down</span>
                        <span><i style={{ background: STATUS_COLOR.Isolated }} />Isolated</span>
                        <span><i style={{ background: "#1a202c" }} />Gateway</span>
                        <span><i style={{ background: "#dd6b20" }} />Tracked route</span>
                        <span className="mt-muted">Numbers on links = power cost (mW)</span>
                    </div>
                </section>

                <section className="mt-card">
                    <h2>Route tracker</h2>
                    <p className="mt-muted">
                        Find a node by its ID or MAC address to see the hops its
                        telemetry takes to reach the gateway.
                    </p>

                    <form
                        className="mt-search"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (search.trim()) selectNode(search.trim());
                        }}
                    >
                        <input
                            list="mt-nodes"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="e.g. PUMP-002 or AA:BB:CC:DD:EE:0D"
                            aria-label="Node ID or MAC address"
                        />
                        <datalist id="mt-nodes">
                            {topology.nodes
                                .filter((n) => !n.isGateway)
                                .flatMap((n) => [
                                    <option key={n.id} value={n.id}>{n.location}</option>,
                                    <option key={n.mac} value={n.mac}>{n.id}</option>,
                                ])}
                        </datalist>
                        <button type="submit">Track</button>
                    </form>

                    {routeError && <p className="mt-error">{routeError}</p>}

                    {route && (
                        <div className="mt-route">
                            <div className="mt-route-head">
                                <strong>{route.node}</strong>
                                <span className={`mt-badge ${route.status.toLowerCase()}`}>
                                    {route.status}
                                </span>
                            </div>
                            <p className="mt-muted">
                                {selectedNode?.location} · {route.mac}
                            </p>

                            {route.path ? (
                                <>
                                    <PathChain path={route.path} />
                                    <p>
                                        <strong>{route.hops}</strong> hop{route.hops === 1 ? "" : "s"} ·
                                        total <strong>{route.mstCost} mW</strong> along the minimum
                                        spanning tree
                                    </p>
                                    <table className="mt-table small">
                                        <thead>
                                            <tr><th>Hop</th><th>Link</th><th>Cost</th></tr>
                                        </thead>
                                        <tbody>
                                            {route.links.map((l, i) => (
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    <td>{l.from} → {l.to}</td>
                                                    <td>{l.powerCost} mW</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            ) : route.status === "Down" ? (
                                <>
                                    <p className="mt-error">
                                        This node is down, so it has no route. Traffic that
                                        used to pass through it can hop via:
                                    </p>
                                    {route.hopVia.length > 0 ? (
                                        <ul className="mt-list">
                                            {route.hopVia.map((h) => (
                                                <li key={h.node}>
                                                    <strong>{h.node}</strong> (link {h.linkCost} mW)
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-muted">No working neighbours.</p>
                                    )}
                                </>
                            ) : (
                                <p className="mt-error">
                                    This node is powered but every path to the gateway is
                                    broken (isolated).
                                </p>
                            )}

                            {selectedNode && !selectedNode.isGateway && (
                                <button
                                    type="button"
                                    className={route.status === "Down" ? "mt-btn restore" : "mt-btn fail"}
                                    disabled={busy}
                                    onClick={() =>
                                        toggleFailure(route.node, route.status !== "Down")
                                    }
                                >
                                    {route.status === "Down"
                                        ? "Restore this node"
                                        : "Simulate failure of this node"}
                                </button>
                            )}
                        </div>
                    )}

                    {!route && !routeError && (
                        <p className="mt-muted mt-hint">
                            Nothing tracked yet. Click a node on the map or search above.
                        </p>
                    )}
                </section>
            </div>

            {/* ---------- traversal ---------- */}
            <section className="mt-card">
                <div className="mt-card-head">
                    <div>
                        <h2>Connectivity and self-healing</h2>
                        <p className="mt-muted">
                            A graph traversal from the gateway lists every device
                            still connected. Anything it cannot reach is down or cut
                            off, and the table shows where its traffic hops instead.
                        </p>
                    </div>
                    <div className="mt-toggle" role="group" aria-label="Traversal algorithm">
                        <button
                            type="button"
                            className={mode === "bfs" ? "on" : ""}
                            onClick={() => setMode("bfs")}
                        >
                            Breadth-first
                        </button>
                        <button
                            type="button"
                            className={mode === "dfs" ? "on" : ""}
                            onClick={() => setMode("dfs")}
                        >
                            Depth-first
                        </button>
                    </div>
                </div>

                {traversal && (
                    <div className="mt-cols">
                        <div>
                            <h3>
                                Visit order ({traversal.mode.toUpperCase()}) ·{" "}
                                {traversal.connectedCount} connected
                            </h3>
                            <ol className="mt-visit">
                                {traversal.visitOrder.map((s) => (
                                    <li key={s.node}>
                                        <span className="mt-chip">{s.node}</span>
                                        <span className="mt-muted">
                                            {s.parent ? `via ${s.parent} · ` : ""}
                                            {s.hops} hop{s.hops === 1 ? "" : "s"}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div>
                            <h3>Down nodes and where to hop</h3>
                            {traversal.down.length === 0 && (
                                <p className="mt-muted">Every node is up.</p>
                            )}
                            {traversal.down.map((d) => (
                                <div key={d.id} className="mt-down">
                                    <div className="mt-route-head">
                                        <strong>{d.id}</strong>
                                        <button
                                            type="button"
                                            className="mt-btn restore small"
                                            disabled={busy}
                                            onClick={() => toggleFailure(d.id, false)}
                                        >
                                            Restore
                                        </button>
                                    </div>
                                    <p className="mt-muted">
                                        Hop via:{" "}
                                        {d.hopVia.length > 0
                                            ? d.hopVia.map((h) => `${h.node} (${h.linkCost} mW)`).join(", ")
                                            : "no working neighbour"}
                                    </p>
                                </div>
                            ))}

                            {traversal.isolated.length > 0 && (
                                <p className="mt-error">
                                    Isolated (powered, no path): {traversal.isolated.join(", ")}
                                </p>
                            )}

                            <h3>Routes that had to change</h3>
                            {traversal.failover.length === 0 ? (
                                <p className="mt-muted">
                                    No route used a failed node. Fail a busy relay such as
                                    ACT-001 to watch the mesh heal.
                                </p>
                            ) : (
                                <table className="mt-table small">
                                    <thead>
                                        <tr><th>Node</th><th>Old path</th><th>New path</th></tr>
                                    </thead>
                                    <tbody>
                                        {traversal.failover.map((f) => (
                                            <tr key={f.node}>
                                                <td>{f.node}</td>
                                                <td className="mt-old">{f.oldPath.join(" → ")}</td>
                                                <td>
                                                    {f.newPath
                                                        ? `${f.newPath.join(" → ")} (${f.newCost} mW)`
                                                        : "Isolated"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* ---------- historical log ---------- */}
            <section className="mt-card">
                <div className="mt-card-head">
                    <div>
                        <h2>
                            Historical telemetry log{selected ? ` · ${selected}` : ""}
                        </h2>
                        <p className="mt-muted">
                            Readings are fetched with an AVL-tree range query, so only
                            the part of the tree that overlaps the time window is read.
                        </p>
                    </div>
                </div>

                <div className="mt-range">
                    <select
                        value={selected}
                        onChange={(e) => e.target.value && selectNode(e.target.value)}
                        aria-label="Node"
                    >
                        <option value="">Choose a node…</option>
                        {topology.nodes
                            .filter((n) => !n.isGateway)
                            .map((n) => (
                                <option key={n.id} value={n.id}>
                                    {n.id} · {n.location}
                                </option>
                            ))}
                    </select>
                    <label>
                        From
                        <input
                            type="datetime-local"
                            value={rangeFrom}
                            onChange={(e) => setRangeFrom(e.target.value)}
                        />
                    </label>
                    <label>
                        To
                        <input
                            type="datetime-local"
                            value={rangeTo}
                            onChange={(e) => setRangeTo(e.target.value)}
                        />
                    </label>
                    <button
                        type="button"
                        disabled={!selected}
                        onClick={() => runQuery(selected, rangeFrom, rangeTo)}
                    >
                        Run query
                    </button>
                </div>

                <div className="mt-quick">
                    {RANGES.map((r) => (
                        <button
                            key={r.hours}
                            type="button"
                            disabled={!selected}
                            onClick={() => applyRange(r.hours)}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {historyError && <p className="mt-error">{historyError}</p>}

                {!selected && !historyError && (
                    <p className="mt-muted mt-hint">
                        Pick a node (or click one on the map) to see its history.
                    </p>
                )}

                {history && (
                    <>
                        <div className="mt-metrics">
                            <div><b>{history.matched}</b><span>readings in range</span></div>
                            <div><b>{history.totalStored}</b><span>stored for this node</span></div>
                            <div>
                                <b>{history.nodesVisited}</b>
                                <span>tree nodes visited (a scan checks {history.totalStored})</span>
                            </div>
                            <div><b>{history.treeHeight}</b><span>tree height ({history.rotations} rotations)</span></div>
                            <div>
                                <b>{history.treeMicroseconds} µs</b>
                                <span>AVL query (scan: {history.linearScanMicroseconds} µs)</span>
                            </div>
                        </div>

                        {history.matched === 0 ? (
                            <p className="mt-muted mt-hint">
                                No readings in that window.
                                {selectedNode?.status === "Down" &&
                                    " This node is down, so it stopped reporting."}
                            </p>
                        ) : (
                            <>
                                {chartLines.length > 0 && (
                                    <div className="mt-chart">
                                        <ResponsiveContainer width="100%" height={260}>
                                            <LineChart data={chartData}>
                                                <CartesianGrid stroke="#edf2f7" vertical={false} />
                                                <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={32} />
                                                <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
                                                <Tooltip />
                                                {chartLines.map((l) => (
                                                    <Line
                                                        key={l.key}
                                                        type="monotone"
                                                        dataKey={l.key}
                                                        name={l.label}
                                                        stroke={l.color}
                                                        strokeWidth={2}
                                                        dot={false}
                                                        isAnimationActive={false}
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                <div className="mt-scroll">
                                    <table className="mt-table">
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Type</th>
                                                {tableColumns.map((c) => (
                                                    <th key={c}>{c}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...history.readings]
                                                .reverse()
                                                .slice(0, 100)
                                                .map((r, i) => (
                                                    <tr key={r.timestamp + i}>
                                                        <td>{new Date(r.timestamp).toLocaleString()}</td>
                                                        <td>{r.telemetryType}</td>
                                                        {tableColumns.map((c) => (
                                                            <td key={c}>{String(r.data[c] ?? "")}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="mt-muted">
                                    Showing the latest {Math.min(100, history.returned)} of{" "}
                                    {history.matched} readings in the window (newest first).
                                </p>
                            </>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}

export default MeshTopologyPage;
