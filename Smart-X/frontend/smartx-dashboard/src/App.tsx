import { useEffect, useState } from "react";
import { getHealth, type HealthResponse } from "./services/api";

function App() {

    console.log("API URL:", import.meta.env.VITE_API_BASE_URL);
    console.log("TEST:", import.meta.env.VITE_TEST);

    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getHealth()
            .then(setHealth)
            .catch((err) => {
                setError(err instanceof Error ? err.message : "API connection failed.");
            });
    }, []);

    return (
        <div>
            <header>
                <h1>Smart-X</h1>
                <p>IoT Mesh Ecosystem</p>
            </header>

            <main>
                <section>
                    <h2>Smart-X Gateway</h2>

                    <p>
                        Data Ingestion and Validation Gateway
                    </p>

                    {health && (
                        <p>
                            Gateway Status: <strong>{health.status}</strong>
                        </p>
                    )}

                    {error && (
                        <p>
                            Gateway Status: <strong>Offline</strong>
                        </p>
                    )}
                </section>

                <section>
                    <h2>Architectural Pillars</h2>

                    <article>
                        <h3>📡 Sensor Data Ingestion and Telemetry</h3>
                        <p>Available in Part 1</p>
                    </article>

                    <article>
                        <h3>⚡ Real-Time Command Stream and History</h3>
                        <p>Disabled — Part 2</p>
                    </article>

                    <article>
                        <h3>🕸️ Network Topology and Mesh Routing</h3>
                        <p>Disabled — Final PoE</p>
                    </article>
                </section>
            </main>
        </div>
    );
}

export default App;