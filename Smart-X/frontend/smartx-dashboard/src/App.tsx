import { useEffect, useState } from "react";
import {
    getHealth,
    getSensors,
    getTelemetry,
    type HealthResponse,
    type Sensor,
    type TelemetryPacket,
} from "./services/api";

function renderTelemetryData(
    telemetryType: string,
    data: unknown
) {
    if (!data || typeof data !== "object") {
        return <p>No telemetry data available.</p>;
    }

    const values = data as Record<string, unknown>;

    if (telemetryType === "Environmental") {
        return (
            <div className="reading-grid">
                <div className="reading-card">
                    <span>Temperature</span>
                    <strong>
                        {values.temperature ?? "--"} °C
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Humidity</span>
                    <strong>
                        {values.humidity ?? "--"} %
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Pressure</span>
                    <strong>
                        {values.pressure ?? "--"} hPa
                    </strong>
                </div>
            </div>
        );
    }

    if (telemetryType === "PowerConsumption") {
        return (
            <div className="reading-grid">
                <div className="reading-card">
                    <span>Voltage</span>
                    <strong>
                        {values.voltage ?? "--"} V
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Current</span>
                    <strong>
                        {values.current ?? "--"} A
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Power</span>
                    <strong>
                        {values.power ?? "--"} W
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Energy Consumed</span>
                    <strong>
                        {values.energyConsumed ?? "--"} kWh
                    </strong>
                </div>
            </div>
        );
    }

    if (telemetryType === "Actuator") {
        return (
            <div className="reading-grid">
                <div className="reading-card">
                    <span>State</span>
                    <strong>
                        {String(values.state ?? "--")}
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Value</span>
                    <strong>
                        {values.value ?? "--"}
                    </strong>
                </div>
            </div>
        );
    }

    return (
        <pre>
            {JSON.stringify(data, null, 2)}
        </pre>
    );
}
function App() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
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
        <div className="app">

            <header className="dashboard-header">
                <div>
                    <h1>Smart-X</h1>
                    <p>IoT Mesh Ecosystem</p>
                </div>

                <div className="gateway-status">
                    <span
                        className={
                            health
                                ? "status-dot online"
                                : "status-dot offline"
                        }
                    />

                    <span>
                        Gateway:{" "}
                        <strong>
                            {health ? "Online" : "Offline"}
                        </strong>
                    </span>
                </div>
            </header>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            <main className="dashboard">

                <section className="overview">
                    <div className="overview-card">
                        <span>Total Sensors</span>
                        <strong>{sensors.length}</strong>
                    </div>

                    <div className="overview-card">
                        <span>Online</span>
                        <strong>
                            {
                                sensors.filter(
                                    (sensor) => sensor.isOnline
                                ).length
                            }
                        </strong>
                    </div>

                    <div className="overview-card">
                        <span>Offline</span>
                        <strong>
                            {
                                sensors.filter(
                                    (sensor) => !sensor.isOnline
                                ).length
                            }
                        </strong>
                    </div>
                </section>

                <section>
                    <div className="section-heading">
                        <div>
                            <h2>Registered Sensors</h2>
                            <p>
                                Monitor connected Smart-X devices
                            </p>
                        </div>
                    </div>

                    {sensors.length === 0 ? (
                        <div className="empty-state">
                            <h3>No sensors registered</h3>
                            <p>
                                Register a sensor through the Smart-X API
                                to begin monitoring.
                            </p>
                        </div>
                    ) : (
                        <div className="sensor-grid">
                            {sensors.map((sensor) => (
                                <article
                                    key={sensor.id}
                                    className={
                                        selectedSensor?.id === sensor.id
                                            ? "sensor-card selected"
                                            : "sensor-card"
                                    }
                                    onClick={() =>
                                        setSelectedSensor(sensor)
                                    }
                                >
                                    <div className="sensor-card-header">
                                        <div>
                                            <h3>
                                                {sensor.deviceIdentifier}
                                            </h3>

                                            <span className="sensor-category">
                                                {sensor.category}
                                            </span>
                                        </div>

                                        <span
                                            className={
                                                sensor.isOnline
                                                    ? "sensor-status online"
                                                    : "sensor-status offline"
                                            }
                                        >
                                            <span className="status-dot" />
                                            {sensor.isOnline
                                                ? "Online"
                                                : "Offline"}
                                        </span>
                                    </div>

                                    <div className="sensor-details">
                                        <div>
                                            <span>Location</span>
                                            <strong>
                                                {sensor.deploymentLocation}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>MAC Address</span>
                                            <strong>
                                                {sensor.macAddress}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="sensor-last-seen">
                                        Last seen:{" "}
                                        {sensor.lastSeen
                                            ? new Date(
                                                sensor.lastSeen
                                            ).toLocaleString()
                                            : "Never"}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="telemetry-section">
                    <div className="section-heading">
                        <div>
                            <h2>Telemetry</h2>
                            <p>
                                Sensor readings and historical data
                            </p>
                        </div>
                    </div>

                    {!selectedSensor ? (
                        <div className="empty-state">
                            <h3>Select a sensor</h3>
                            <p>
                                Select a sensor above to view its
                                telemetry.
                            </p>
                        </div>
                    ) : (
                        <div className="telemetry-panel">

                            <div className="telemetry-header">
                                <div>
                                    <h3>
                                        {selectedSensor.deviceIdentifier}
                                    </h3>
                                    <span>
                                        {selectedSensor.category}
                                    </span>
                                </div>

                                <span
                                    className={
                                        selectedSensor.isOnline
                                            ? "sensor-status online"
                                            : "sensor-status offline"
                                    }
                                >
                                    {selectedSensor.isOnline
                                        ? "Online"
                                        : "Offline"}
                                </span>
                            </div>

                            {telemetry.length === 0 ? (
                                <div className="empty-state">
                                    <p>
                                        No telemetry available for this
                                        sensor.
                                    </p>
                                </div>
                            ) : (
                                <div className="telemetry-list">
                                    {telemetry.map((packet) => (
                                        <article
                                            className="telemetry-card"
                                            key={packet.packetId}
                                        >
                                            <div>
                                                <span>Telemetry Type</span>
                                                <strong>
                                                    {packet.telemetryType}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>Timestamp</span>
                                                <strong>
                                                    {new Date(
                                                        packet.timestamp
                                                    ).toLocaleString()}
                                                </strong>
                                            </div>

                                            {renderTelemetryData(
                                                packet.telemetryType,
                                                packet.data
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <section>
                    <div className="section-heading">
                        <div>
                            <h2>Architectural Pillars</h2>
                            <p>
                                Smart-X platform capabilities
                            </p>
                        </div>
                    </div>

                    <div className="pillars-grid">
                        <article className="pillar-card active">
                            <h3>
                                📡 Sensor Data Ingestion
                            </h3>
                            <p>
                                Active — Part 1
                            </p>
                        </article>

                        <article className="pillar-card disabled">
                            <h3>
                                ⚡ Command Stream & History
                            </h3>
                            <p>
                                Disabled — Part 2
                            </p>
                        </article>

                        <article className="pillar-card disabled">
                            <h3>
                                🕸️ Network Topology
                            </h3>
                            <p>
                                Disabled — Final PoE
                            </p>
                        </article>
                    </div>
                </section>

            </main>
        </div>
    );
}

export default App;