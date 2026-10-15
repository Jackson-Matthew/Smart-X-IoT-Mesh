// API calls for PILLAR 2: Real-Time Command Stream & History.
// Mirrors the C# controllers: /api/alerts, /api/commands, /api/insights.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface StreamAlert {
    alertId: string;
    deviceIdentifier: string;
    alertType: string;
    severity: number;
    message: string;
    timestamp: string;
}

export interface AlertStatus {
    disconnectedNodes: string[];
    activeAlertKeys: string[];
    telemetryQueueDepth: number;
    criticalQueueDepth: number;
}

export interface TimelinePacket {
    deviceIdentifier: string;
    timestamp: string;
    telemetryType: string;
    data: Record<string, unknown>;
}

export interface DeviceCommand {
    commandId: string;
    deviceIdentifier: string;
    commandName: string;
    previousState: string;
    newState: string;
    issuedAt: string;
}

export interface Suggestion {
    kind: "Command" | "Search";
    title: string;
    reason: string;
    confidence: number;
    support: number;
    deviceIdentifier: string;
    commandName: string;
    newState: string;
    searchText: string;
}

export interface Insight {
    severity: number;
    title: string;
    detail: string;
    deviceIdentifier: string;
}

export interface LearnedPattern {
    trigger: string;
    next: string;
    count: number;
}

export interface InsightsResponse {
    suggestions: Suggestion[];
    insights: Insight[];
    patterns: LearnedPattern[];
    actionsRecorded: number;
}

// Small helper so every call shares the same error handling.
async function request<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, options);

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${response.status}).`);
    }

    return response.json();
}

export const getAlerts = () => request<StreamAlert[]>("/api/alerts");

export const getAlertStatus = () =>
    request<AlertStatus>("/api/alerts/status");

// Readings for one device, already sorted oldest -> newest by the API.
export const getTimeline = (deviceIdentifier: string) =>
    request<TimelinePacket[]>(
        `/api/alerts/timeline/${encodeURIComponent(deviceIdentifier)}`
    );

export const issueCommand = (command: {
    deviceIdentifier: string;
    commandName: string;
    newState: string;
}) =>
    request<DeviceCommand>("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
    });

export const undoCommand = () =>
    request<{ undone: boolean; message: string }>("/api/commands/undo", {
        method: "POST",
    });

export const getCommandHistory = () =>
    request<DeviceCommand[]>("/api/commands/history");

export const getCommandStates = () =>
    request<Record<string, string>>("/api/commands/states");

export const getInsights = () => request<InsightsResponse>("/api/insights");

export const recordSearch = (query: string) =>
    request<{ recorded: boolean }>("/api/insights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
    });

export interface ProcessingEvent {
    sequence: number;
    kind: string;
    message: string;
    timestamp: string;
}

// The order things were processed in (critical alerts vs queued readings).
export const getProcessingLog = () =>
    request<ProcessingEvent[]>("/api/alerts/processing-log");
