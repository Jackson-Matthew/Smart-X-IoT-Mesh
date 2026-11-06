// API calls for PILLAR 3: Network Topology & Mesh Routing.
// Mirrors the C# MeshController: /api/mesh/...

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export type NodeStatus = "Connected" | "Down" | "Isolated";

export interface MeshNode {
    id: string;
    mac: string;
    location: string;
    category: string;
    x: number;
    y: number;
    isGateway: boolean;
    status: NodeStatus;
    hops: number | null;
    readings: number;
}

export interface MeshLink {
    from: string;
    to: string;
    powerCost: number;
    active: boolean;
    inMst: boolean;
}

export interface TopologySummary {
    total: number;
    connected: number;
    down: number;
    isolated: number;
    mstCost: number;
    mstLinks: number;
    activeLinkCost: number;
    activeLinks: number;
    totalReadings: number;
}

export interface Topology {
    gateway: string;
    nodes: MeshNode[];
    edges: MeshLink[];
    summary: TopologySummary;
}

export interface HopOption {
    node: string;
    linkCost: number;
}

export interface TraversalStep {
    node: string;
    parent: string | null;
    hops: number;
}

export interface FailoverEntry {
    node: string;
    oldPath: string[];
    newPath: string[] | null;
    newCost: number | null;
}

export interface Traversal {
    mode: "bfs" | "dfs";
    visitOrder: TraversalStep[];
    connectedCount: number;
    down: { id: string; hopVia: HopOption[] }[];
    isolated: string[];
    failover: FailoverEntry[];
}

export interface RouteInfo {
    node: string;
    mac: string | null;
    status: NodeStatus;
    path: string[] | null;
    hops: number | null;
    links: { from: string; to: string; powerCost: number }[];
    mstCost: number | null;
    hopVia: HopOption[];
}

export interface HistoryReading {
    deviceIdentifier: string;
    timestamp: string;
    telemetryType: string;
    data: Record<string, unknown>;
}

export interface HistoryResult {
    node: string;
    from: string;
    to: string;
    matched: number;
    returned: number;
    totalStored: number;
    nodesVisited: number;
    treeHeight: number;
    rotations: number;
    treeMicroseconds: number;
    linearScanMicroseconds: number;
    readings: HistoryReading[];
}

async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`);

    if (!response.ok) {
        let message = `Request failed (${response.status})`;

        try {
            const body = await response.json();
            if (body?.error) message = body.error;
        } catch {
            // keep the generic message
        }

        throw new Error(message);
    }

    return response.json() as Promise<T>;
}

export const getTopology = () => getJson<Topology>("/api/mesh/topology");

export const getTraversal = (mode: "bfs" | "dfs") =>
    getJson<Traversal>(`/api/mesh/traverse?mode=${mode}`);

export const getRoute = (idOrMac: string) =>
    getJson<RouteInfo>(`/api/mesh/route/${encodeURIComponent(idOrMac)}`);

export const getHistory = (idOrMac: string, from: Date, to: Date, limit = 500) =>
    getJson<HistoryResult>(
        `/api/mesh/history/${encodeURIComponent(idOrMac)}` +
            `?from=${encodeURIComponent(from.toISOString())}` +
            `&to=${encodeURIComponent(to.toISOString())}&limit=${limit}`,
    );

export async function setNodeDown(id: string, down: boolean): Promise<void> {
    const response = await fetch(
        `${API_BASE_URL}/api/mesh/nodes/${encodeURIComponent(id)}/status`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ down }),
        },
    );

    if (!response.ok) {
        throw new Error("Could not change the node status.");
    }
}
