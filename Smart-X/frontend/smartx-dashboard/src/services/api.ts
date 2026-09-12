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