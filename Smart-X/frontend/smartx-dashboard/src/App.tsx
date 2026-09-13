import { useEffect, useState } from "react";
import {
    getHealth,
    getSensors,
    getTelemetry,
    type HealthResponse,
    type Sensor,
    type TelemetryPacket,
} from "./services/api";
function App() {

    console.log("API URL:", import.meta.env.VITE_API_BASE_URL);
    console.log("TEST:", import.meta.env.VITE_TEST);

    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [selectedSensor, setSelectedSensor] =
        useState<Sensor | null>(null);

    const [telemetry, setTelemetry] =
        useState<TelemetryPacket<unknown>[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getHealth()
            .then(setHealth)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "API connection failed."
                );
            });

        getSensors()
            .then(setSensors)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to retrieve sensors."
                );
            });
    }, []);
    useEffect(() => {
        if (!selectedSensor) {
            setTelemetry([]);
            return;
        }

        getTelemetry(selectedSensor.deviceIdentifier)
            .then(setTelemetry)
            .catch((err) => {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to retrieve telemetry."
                );
            });
    }, [selectedSensor]);

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
                            Gateway Status:{" "}
                            <strong>{health.status}</strong>
                        </p>
                    )}

                    {error && (
                        <p>
                            Gateway Status: <strong>Offline</strong>
                        </p>
                    )}
                </section>

                <section>
                    <h2>Registered Sensors</h2>

                    {sensors.length === 0 ? (
                        <p>No sensors registered.</p>
                    ) : (
                            sensors.map((sensor) => (
                                <article
                                    key={sensor.id}
                                    onClick={() => setSelectedSensor(sensor)}
                                    style={{
                                        cursor: "pointer",
                                        border: "1px solid #ccc",
                                        padding: "16px",
                                        marginBottom: "10px",
                                    }}
                                >
                                <h3>{sensor.deviceIdentifier}</h3>

                                <p>
                                    Category: {sensor.category}
                                </p>

                                <p>
                                    Location: {sensor.deploymentLocation}
                                </p>

                                <p>
                                    MAC Address: {sensor.macAddress}
                                </p>

                                <p>
                                    Status:{" "}
                                    <strong>
                                        {sensor.isOnline
                                            ? "Online"
                                            : "Offline"}
                                    </strong>
                                </p>

                                <p>
                                    Last Seen:{" "}
                                    {sensor.lastSeen
                                        ? new Date(
                                            sensor.lastSeen
                                        ).toLocaleString()
                                        : "Never"}
                                </p>
                            </article>
                        ))
                    )}
                </section>

                <section>
                    <h2>Telemetry</h2>

                    {!selectedSensor && (
                        <p>Select a sensor to view its telemetry.</p>
                    )}

                    {selectedSensor && (
                        <>
                            <h3>
                                {selectedSensor.deviceIdentifier}
                            </h3>

                            {telemetry.length === 0 ? (
                                <p>No telemetry available.</p>
                            ) : (
                                telemetry.map((packet) => (
                                    <article key={packet.packetId}>
                                        <p>
                                            <strong>Type:</strong>{" "}
                                            {packet.telemetryType}
                                        </p>

                                        <p>
                                            <strong>Time:</strong>{" "}
                                            {new Date(
                                                packet.timestamp
                                            ).toLocaleString()}
                                        </p>

                                        <pre>
                                            {JSON.stringify(
                                                packet.data,
                                                null,
                                                2
                                            )}
                                        </pre>
                                    </article>
                                ))
                            )}
                        </>
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