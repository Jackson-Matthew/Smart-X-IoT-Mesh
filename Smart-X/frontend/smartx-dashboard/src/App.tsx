import { useEffect, useState, type FormEvent } from "react";
import {
    getHealth,
    getSensors,
    getTelemetry,
    getSensorMedia,
    getIssues,
    registerSensor,
    uploadSensorMedia,
    reportIssue,
    resolveIssue,
    type HealthResponse,
    type Sensor,
    type SensorMedia,
    type ReportedIssue,
    type TelemetryPacket,
} from "./services/api";

function renderValue(value: unknown, fallback = "--"): string {
    return value === null || value === undefined ? fallback : String(value);
}

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
                        {renderValue(values.temperature)} °C
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Humidity</span>
                    <strong>
                        {renderValue(values.humidity)} %
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Pressure</span>
                    <strong>
                        {renderValue(values.pressure)} hPa
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
                        {renderValue(values.voltage)} V
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Current</span>
                    <strong>
                        {renderValue(values.current)} A
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Power</span>
                    <strong>
                        {renderValue(values.power)} W
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Energy Consumed</span>
                    <strong>
                        {renderValue(values.energyConsumed)} kWh
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
                        {renderValue(values.state)}
                    </strong>
                </div>

                <div className="reading-card">
                    <span>Value</span>
                    <strong>
                        {renderValue(values.value)}
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
    const [deviceIdentifier, setDeviceIdentifier] = useState("");
    const [macAddress, setMacAddress] = useState("");
    const [deploymentLocation, setDeploymentLocation] = useState("");
    const [category, setCategory] = useState("Environmental");
    const [registrationMessage, setRegistrationMessage] =
        useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sensorMedia, setSensorMedia] = useState<SensorMedia[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [mediaMessage, setMediaMessage] = useState("");

    const [issues, setIssues] = useState<ReportedIssue[]>([]);

    const [issueDescription, setIssueDescription] = useState("");

    const [issueSeverity, setIssueSeverity] =
        useState("Medium");

    const [isReportingIssue, setIsReportingIssue] =
        useState(false);

    const [issueMessage, setIssueMessage] =

        useState<string | null>(null);

    const unresolvedIssues = issues.filter(
        (issue) => !issue.resolved
    );

    const offlineSensors = sensors.filter(
        (sensor) => !sensor.isOnline
    );

    const requiresAttention =
        unresolvedIssues.length > 0 ||
        offlineSensors.length > 0;

    useEffect(() => {
        const refreshDashboard = async () => {
            try {
                const [healthData, sensorData, issueData] =
                    await Promise.all([
                        getHealth(),
                        getSensors(),
                        getIssues(),
                    ]);

                setHealth(healthData);
                setSensors(sensorData);
                setIssues(issueData);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to refresh dashboard data."
                );
            }
        };

        refreshDashboard();

        const refreshInterval = setInterval(
            refreshDashboard,
            10000
        );

        return () => {
            clearInterval(refreshInterval);
        };
    }, []);

    async function handleReportIssue(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!selectedSensor) {
            setIssueMessage("Please select a sensor first.");
            return;
        }

        if (!issueDescription.trim()) {
            setIssueMessage(
                "Please describe the issue."
            );
            return;
        }

        setIsReportingIssue(true);
        setIssueMessage(null);

        try {
            const newIssue = await reportIssue({
                sensorId: selectedSensor.id,
                description: issueDescription.trim(),
                severity: issueSeverity,
            });

            setIssues((currentIssues) => [
                newIssue,
                ...currentIssues,
            ]);

            setIssueDescription("");
            setIssueSeverity("Medium");

            setIssueMessage(
                "Issue reported successfully."
            );
        } catch (err) {
            setIssueMessage(
                err instanceof Error
                    ? err.message
                    : "Unable to report issue."
            );
        } finally {
            setIsReportingIssue(false);
        }
    }

    async function handleResolveIssue(issueId: string) {
        try {
            await resolveIssue(issueId);

            setIssues((currentIssues) =>
                currentIssues.map((issue) =>
                    issue.id === issueId
                        ? { ...issue, resolved: true }
                        : issue
                )
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to resolve issue."
            );
        }
    }

    async function handleSelectSensor(sensor: Sensor) {
        setSelectedSensor(sensor);
        setSelectedFile(null);
        setMediaMessage("");

        try {
            const [telemetryData, mediaData] = await Promise.all([
                getTelemetry(sensor.deviceIdentifier),
                getSensorMedia(sensor.id),
            ]);

            setTelemetry(telemetryData);
            setSensorMedia(mediaData);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Unable to load sensor data."
            );

            setTelemetry([]);
            setSensorMedia([]);
        }
    }

    async function handleFileUpload() {
        if (!selectedSensor || !selectedFile) {
            return;
        }

        const allowedExtensions = [
            ".txt",
            ".log",
            ".jpg",
            ".jpeg",
            ".png",
        ];

        const extension =
            selectedFile.name
                .substring(selectedFile.name.lastIndexOf("."))
                .toLowerCase();

        if (!allowedExtensions.includes(extension)) {
            setMediaMessage(
                "Only TXT, LOG, JPG, JPEG and PNG files are allowed."
            );

            return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            setMediaMessage(
                "File size cannot exceed 10 MB."
            );

            return;
        }

        setUploadingFile(true);
        setMediaMessage("");

        try {
            const uploadedFile = await uploadSensorMedia(
                selectedSensor.id,
                selectedFile
            );

            setSensorMedia((current) => [
                ...current,
                uploadedFile,
            ]);

            setSelectedFile(null);

            setMediaMessage(
                "File attached successfully."
            );
        } catch (error) {
            setMediaMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to upload file."
            );
        } finally {
            setUploadingFile(false);
        }
    }


    const handleRegisterSensor = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        setError(null);
        setRegistrationMessage(null);

        if (!deviceIdentifier.trim()) {
            setError("Device identifier is required.");
            return;
        }

        const macPattern =
            /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

        if (!macPattern.test(macAddress.trim())) {
            setError(
                "Please enter a valid MAC address, for example AA:BB:CC:DD:EE:01."
            );
            return;
        }

        if (!deploymentLocation.trim()) {
            setError("Deployment location is required.");
            return;
        }

        try {
            setIsRegistering(true);

            const newSensor = await registerSensor({
                deviceIdentifier: deviceIdentifier.trim(),
                macAddress: macAddress.trim(),
                deploymentLocation: deploymentLocation.trim(),
                category,
            });

            setSensors((currentSensors) => [
                ...currentSensors,
                newSensor,
            ]);

            setRegistrationMessage(
                `Sensor ${newSensor.deviceIdentifier} registered successfully.`
            );

            setDeviceIdentifier("");
            setMacAddress("");
            setDeploymentLocation("");
            setCategory("Environmental");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to register sensor."
            );
        } finally {
            setIsRegistering(false);
        }
    };


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
                {requiresAttention && (
                    <section className="attention-section">
                        <div className="attention-banner">
                            <div>
                                <strong>⚠ Attention Required</strong>

                                <p>
                                    {offlineSensors.length > 0 && (
                                        <>
                                            {offlineSensors.length} sensor
                                            {offlineSensors.length !== 1 ? "s" : ""}{" "}
                                            currently offline.
                                        </>
                                    )}

                                    {offlineSensors.length > 0 &&
                                        unresolvedIssues.length > 0 && (
                                            <> </>
                                        )}

                                    {unresolvedIssues.length > 0 && (
                                        <>
                                            {unresolvedIssues.length} unresolved
                                            issue
                                            {unresolvedIssues.length !== 1
                                                ? "s"
                                                : ""}{" "}
                                            requiring attention.
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </section>
                )}
                <section className="registration-section">
                    <div className="section-heading">
                        <div>
                            <h2>Register Sensor</h2>
                            <p>
                                Add a new Smart-X device to the monitoring system
                            </p>
                        </div>
                    </div>

                    <form
                        className="registration-form"
                        onSubmit={handleRegisterSensor}
                    >
                        <div className="form-group">
                            <label htmlFor="deviceIdentifier">
                                Device Identifier
                            </label>
                            <input
                                id="deviceIdentifier"
                                type="text"
                                placeholder="e.g. TEMP-002"
                                value={deviceIdentifier}
                                onChange={(event) =>
                                    setDeviceIdentifier(event.target.value)
                                }
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="macAddress">
                                MAC Address
                            </label>
                            <input
                                id="macAddress"
                                type="text"
                                placeholder="AA:BB:CC:DD:EE:04"
                                value={macAddress}
                                onChange={(event) =>
                                    setMacAddress(event.target.value)
                                }
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="deploymentLocation">
                                Deployment Location
                            </label>
                            <input
                                id="deploymentLocation"
                                type="text"
                                placeholder="Building A - Room 102"
                                value={deploymentLocation}
                                onChange={(event) =>
                                    setDeploymentLocation(event.target.value)
                                }
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="category">
                                Sensor Category
                            </label>
                            <select
                                id="category"
                                value={category}
                                onChange={(event) =>
                                    setCategory(event.target.value)
                                }
                            >
                                <option value="Environmental">
                                    Environmental
                                </option>
                                <option value="PowerConsumption">
                                    Power Consumption
                                </option>
                                <option value="Actuator">
                                    Actuator
                                </option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="register-button"
                            disabled={isRegistering}
                        >
                            {isRegistering
                                ? "Registering..."
                                : "Register Sensor"}
                        </button>
                    </form>

                    {registrationMessage && (
                        <div className="success-banner">
                            {registrationMessage}
                        </div>
                    )}
                </section>
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
                                    onClick={() => handleSelectSensor(sensor)
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

                {selectedSensor && (
                    <section className="issue-report-section">
                        <div className="section-heading">
                            <div>
                                <h2>Report an Issue</h2>
                                <p>
                                    Report a troubleshooting problem for{" "}
                                    <strong>
                                        {selectedSensor.deviceIdentifier}
                                    </strong>
                                </p>
                            </div>
                        </div>

                        <form
                            className="issue-form"
                            onSubmit={handleReportIssue}
                        >
                            <div className="form-group">
                                <label htmlFor="issueDescription">
                                    Issue Description
                                </label>

                                <textarea
                                    id="issueDescription"
                                    placeholder="Describe the problem..."
                                    value={issueDescription}
                                    onChange={(event) =>
                                        setIssueDescription(
                                            event.target.value
                                        )
                                    }
                                    rows={4}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="issueSeverity">
                                    Severity
                                </label>

                                <select
                                    id="issueSeverity"
                                    value={issueSeverity}
                                    onChange={(event) =>
                                        setIssueSeverity(
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="Low">
                                        Low
                                    </option>

                                    <option value="Medium">
                                        Medium
                                    </option>

                                    <option value="High">
                                        High
                                    </option>

                                    <option value="Critical">
                                        Critical
                                    </option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="issue-button"
                                disabled={isReportingIssue}
                            >
                                {isReportingIssue
                                    ? "Reporting..."
                                    : "Report Issue"}
                            </button>
                        </form>

                        {issueMessage && (
                            <div className="success-banner">
                                {issueMessage}
                            </div>
                        )}
                    </section>
                )}

                <section className="issues-section">
                    <div className="section-heading">
                        <div>
                            <h2>Reported Issues</h2>
                            <p>
                                User-reported troubleshooting issues
                            </p>
                        </div>
                    </div>

                    {issues.length === 0 ? (
                        <div className="empty-state">
                            <h3>No reported issues</h3>
                            <p>
                                No sensor issues have been reported.
                            </p>
                        </div>
                    ) : (
                        <div className="issues-list">
                            {issues.map((issue) => (
                                <article
                                    className={
                                        issue.resolved
                                            ? "issue-card resolved"
                                            : "issue-card"
                                    }
                                    key={issue.id}
                                >
                                    <div className="issue-card-header">
                                        <div>
                                            <h3>
                                                {issue.deviceIdentifier}
                                            </h3>

                                            <span>
                                                {new Date(
                                                    issue.reportedAt
                                                ).toLocaleString()}
                                            </span>
                                        </div>

                                        <span
                                            className={`severity-badge ${issue.severity.toLowerCase()}`}
                                        >
                                            {issue.severity}
                                        </span>
                                    </div>

                                    <p>
                                        {issue.description}
                                    </p>

                                    <div className="issue-card-footer">
                                        <span>
                                            {issue.resolved
                                                ? "✓ Resolved"
                                                : "● Open"}
                                        </span>

                                        {!issue.resolved && (
                                            <button
                                                type="button"
                                                className="resolve-button"
                                                onClick={() =>
                                                    handleResolveIssue(
                                                        issue.id
                                                    )
                                                }
                                            >
                                                Resolve
                                            </button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
                {selectedSensor && (
                    <div className="media-section">
                        <div className="section-heading">
                            <h2>Sensor Attachments</h2>
                            <p>
                                Attach diagnostic logs or photos to this sensor.
                            </p>
                        </div>

                        <div className="media-panel">
                            <div className="upload-controls">
                                <input
                                    type="file"
                                    accept=".txt,.log,.jpg,.jpeg,.png"
                                    onChange={(event) =>
                                        setSelectedFile(
                                            event.target.files?.[0] ?? null
                                        )
                                    }
                                />

                                <button
                                    type="button"
                                    className="upload-button"
                                    disabled={
                                        !selectedFile ||
                                        uploadingFile
                                    }
                                    onClick={handleFileUpload}
                                >
                                    {uploadingFile
                                        ? "Uploading..."
                                        : "Attach File"}
                                </button>
                            </div>

                            <p className="upload-help">
                                Supported files: TXT, LOG, JPG, JPEG and PNG.
                                Maximum size: 10 MB.
                            </p>

                            {mediaMessage && (
                                <div className="success-banner">
                                    {mediaMessage}
                                </div>
                            )}

                            <div className="media-list">
                                {sensorMedia.length === 0 ? (
                                    <div className="empty-state">
                                        <h3>No attachments</h3>
                                        <p>
                                            No logs or photos have been attached
                                            to this sensor yet.
                                        </p>
                                    </div>
                                ) : (
                                    sensorMedia.map((media) => (
                                        <div
                                            className="media-item"
                                            key={media.id}
                                        >
                                            <div>
                                                <strong>
                                                    {media.originalFileName}
                                                </strong>

                                                <span>
                                                    {(media.fileSize / 1024).toFixed(1)}
                                                    {" KB"} ·{" "}
                                                    {new Date(
                                                        media.uploadedAt
                                                    ).toLocaleString()}
                                                </span>
                                            </div>

                                            <span className="media-type">
                                                {media.contentType}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
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