const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface HealthResponse {
    status: string;
    service: string;
    version: string;
}

export interface Sensor {
    id: string;
    deviceIdentifier: string;
    macAddress: string;
    deploymentLocation: string;
    category: string;
    isOnline: boolean;
    registeredAt: string;
    lastSeen: string | null;
}

export interface SensorMedia {
    id: string;
    originalFileName: string;
    storedFileName: string;
    contentType: string;
    fileSize: number;
    uploadedAt: string;
}

export interface ReportedIssue {
    id: string;
    sensorId: string;
    deviceIdentifier: string;
    description: string;
    severity: string;
    reportedAt: string;
    resolved: boolean;
}
export interface EnvironmentalTelemetry {
    temperature: number;
    humidity: number;
    pressure: number;
}

export async function sendEnvironmentalTelemetry(
    packet: TelemetryPacket<EnvironmentalTelemetry>
) {
    const response = await fetch(
        `${API_BASE_URL}/api/Telemetry/environmental`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(packet),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            errorText || "Unable to send environmental telemetry."
        );
    }

    return response.json();
}

export async function sendPowerTelemetry(
    packet: TelemetryPacket<PowerConsumptionTelemetry>
) {
    const response = await fetch(
        `${API_BASE_URL}/api/Telemetry/power`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(packet),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            errorText || "Unable to send power telemetry."
        );
    }

    return response.json();
}

export async function sendActuatorTelemetry(
    packet: TelemetryPacket<ActuatorTelemetry>
) {
    const response = await fetch(
        `${API_BASE_URL}/api/Telemetry/actuator`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(packet),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            errorText || "Unable to send actuator telemetry."
        );
    }

    return response.json();
}
export interface EnvironmentalTelemetry {
    temperature: number;
    humidity: number;
    pressure: number;
}

export interface PowerConsumptionTelemetry {
    voltage: number;
    current: number;
    power: number;
    energyConsumed: number;
}

export interface ActuatorTelemetry {
    state: string;
    value: number;
}

export interface TelemetryPacket<T> {
    packetId: string;
    deviceIdentifier: string;
    timestamp: string;
    telemetryType: string;
    data: T;
}

export async function getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    if (!response.ok) {
        throw new Error("Unable to connect to the Smart-X API.");
    }

    return response.json();
}

export async function getSensors(): Promise<Sensor[]> {
    const response = await fetch(`${API_BASE_URL}/api/Sensors`);

    if (!response.ok) {
        throw new Error("Unable to retrieve sensors.");
    }

    return response.json();
}

export async function registerSensor(sensor: {
    deviceIdentifier: string;
    macAddress: string;
    deploymentLocation: string;
    category: string;
}): Promise<Sensor> {
    const response = await fetch(`${API_BASE_URL}/api/Sensors`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(sensor),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
            errorData?.error ||
            "Unable to register sensor."
        );
    }

    return response.json();
}

export async function getTelemetry(
    deviceIdentifier: string
): Promise<TelemetryPacket<unknown>[]> {
    const response = await fetch(
        `${API_BASE_URL}/api/Telemetry/${encodeURIComponent(deviceIdentifier)}`
    );

    if (!response.ok) {
        throw new Error("Unable to retrieve telemetry.");
    }

    return response.json();
}

export async function uploadSensorMedia(
    sensorId: string,
    file: File
): Promise<SensorMedia> {
    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(
        `${API_BASE_URL}/api/sensors/${sensorId}/media/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
            errorData?.error ||
            "Unable to upload sensor media."
        );
    }

    return response.json();
}

export async function getSensorMedia(
    sensorId: string
): Promise<SensorMedia[]> {
    const response = await fetch(
        `${API_BASE_URL}/api/sensors/${sensorId}/media`
    );

    if (!response.ok) {
        throw new Error(
            "Unable to retrieve sensor media."
        );
    }

    return response.json();
}
export async function getIssues(): Promise<ReportedIssue[]> {
    const response = await fetch(
        `${API_BASE_URL}/api/Issues`
    );

    if (!response.ok) {
        throw new Error("Unable to retrieve reported issues.");
    }

    return response.json();
}

export async function reportIssue(issue: {
    sensorId: string;
    description: string;
    severity: string;
}): Promise<ReportedIssue> {
    const response = await fetch(
        `${API_BASE_URL}/api/Issues`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(issue),
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
            errorData?.error ||
            "Unable to report issue."
        );
    }

    return response.json();
}

export async function resolveIssue(
    issueId: string
): Promise<void> {
    const response = await fetch(
        `${API_BASE_URL}/api/Issues/${issueId}/resolve`,
        {
            method: "PUT",
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
            errorData?.error ||
            "Unable to resolve issue."
        );
    }
}