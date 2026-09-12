const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface HealthResponse {
    status: string;
    service: string;
    version: string;
}

export async function getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    if (!response.ok) {
        throw new Error("Unable to connect to the Smart-X API.");
    }

    return response.json();
}