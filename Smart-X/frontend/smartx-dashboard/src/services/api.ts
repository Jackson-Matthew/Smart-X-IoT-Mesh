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