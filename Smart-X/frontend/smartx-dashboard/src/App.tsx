import {
    useEffect,
    useRef,
    useState,
    type FormEvent
} from "react";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

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
    sendEnvironmentalTelemetry,
    type HealthResponse,
    type Sensor,
    type SensorMedia,
    type ReportedIssue,
    type TelemetryPacket,
    type EnvironmentalTelemetry
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

    const [isSimulating, setIsSimulating] =
        useState(false);

    const [simulationCount, setSimulationCount] =
        useState(0);

    const [simulatedReading, setSimulatedReading] =
        useState<EnvironmentalTelemetry>({
            temperature: 23.5,
            humidity: 48.2,
            pressure: 1012.4,
        });

    const simulatedReadingRef =
        useRef<EnvironmentalTelemetry>({
            temperature: 23.5,
            humidity: 48.2,
            pressure: 1012.4,
        });

    const simulationIntervalRef =
        useRef<ReturnType<typeof setInterval> | null>(null);
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

    useEffect(() => {
        return () => {
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!selectedSensor) {
            return;
        }

        const refreshSelectedTelemetry = async () => {
            try {
                const telemetryData = await getTelemetry(
                    selectedSensor.deviceIdentifier
                );

                setTelemetry(telemetryData);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to refresh telemetry."
                );
            }
        };

        refreshSelectedTelemetry();

        const telemetryInterval = setInterval(
            refreshSelectedTelemetry,
            3000
        );

        return () => {
            clearInterval(telemetryInterval);
        };
    }, [selectedSensor]);
    const environmentalGraphData = telemetry
        .filter(
            (packet) =>
                packet.telemetryType === "Environmental"
        )
        .map((packet) => {
            const data =
                packet.data as Record<string, unknown>;

            return {
                time: new Date(
                    packet.timestamp
                ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                }),

                temperature:
                    typeof data.temperature === "number"
                        ? data.temperature
                        : null,

                humidity:
                    typeof data.humidity === "number"
                        ? data.humidity
                        : null,

                pressure:
                    typeof data.pressure === "number"
                        ? data.pressure
                        : null,
            };
        });
    async function generateSimulatedReading() {
        const current = simulatedReadingRef.current;

        const temperatureChange =
            (Math.random() * 2 - 1) * 0.5;

        const humidityChange =
            (Math.random() * 2 - 1) * 1;

        const pressureChange =
            (Math.random() * 2 - 1) * 0.5;

        const nextReading: EnvironmentalTelemetry = {
            temperature: Number(
                (current.temperature + temperatureChange).toFixed(1)
            ),

            humidity: Number(
                Math.max(
                    0,
                    Math.min(
                        100,
                        current.humidity + humidityChange
                    )
                ).toFixed(1)
            ),

            pressure: Number(
                (current.pressure + pressureChange).toFixed(1)
            ),
        };

        simulatedReadingRef.current = nextReading;
        setSimulatedReading(nextReading);

        try {
            await sendEnvironmentalTelemetry({
                packetId: crypto.randomUUID(),
                deviceIdentifier: "TEMP-001",
                timestamp: new Date().toISOString(),
                telemetryType: "Environmental",
                data: nextReading,
            });

            setSimulationCount(
                (currentCount) => currentCount + 1
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to send simulated telemetry."
            );
        }
    }

    function startSimulator() {
        if (simulationIntervalRef.current) {
            return;
        }

        setIsSimulating(true);

        generateSimulatedReading();

        simulationIntervalRef.current = setInterval(
            generateSimulatedReading,
            3000
        );
    }

    function stopSimulator() {
        if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
        }

        setIsSimulating(false);
    }

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

                <section className="simulator-section">
                    <div className="section-heading">
                        <div>
                            <h2>Sensor Simulator</h2>
                            <p>
                                Simulate live telemetry from TEMP-001
                            </p>
                        </div>

                        <span
                            className={
                                isSimulating
                                    ? "simulator-status running"
                                    : "simulator-status stopped"
                            }
                        >
                            {isSimulating
                                ? "● Running"
                                : "● Stopped"}
                        </span>
                    </div>

                    <div className="simulator-panel">
                        <div className="simulator-info">
                            <span>Simulated Device</span>
                            <strong>TEMP-001</strong>
                        </div>

                        <div className="simulator-info">
                            <span>Temperature</span>
                            <strong>
                                {simulatedReading.temperature} °C
                            </strong>
                        </div>

                        <div className="simulator-info">
                            <span>Humidity</span>
                            <strong>
                                {simulatedReading.humidity} %
                            </strong>
                        </div>

                        <div className="simulator-info">
                            <span>Pressure</span>
                            <strong>
                                {simulatedReading.pressure} hPa
                            </strong>
                        </div>

                        <div className="simulator-info">
                            <span>Readings Sent</span>
                            <strong>
                                {simulationCount}
                            </strong>
                        </div>
                    </div>

                    <div className="simulator-controls">
                        <button
                            type="button"
                            onClick={startSimulator}
                            disabled={isSimulating}
                            className="primary-button"
                        >
                            Start Simulator
                        </button>

                        <button
                            type="button"
                            onClick={stopSimulator}
                            disabled={!isSimulating}
                            className="secondary-button"
                        >
                            Stop Simulator
                        </button>
                    </div>
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
        <p>
            Select a sensor to view telemetry.
        </p>
    </div>
) : telemetry.length === 0 ? (
    <div className="empty-state">
        <p>
            No telemetry data available.
        </p>
    </div>
) : (
    <div className="telemetry-panel">

        <div className="telemetry-current">
            <div className="current-reading">
                <span>Temperature</span>

                <strong>
                    {environmentalGraphData.length > 0
                        ? environmentalGraphData[
                              environmentalGraphData.length - 1
                          ].temperature
                        : "--"}{" "}
                    °C
                </strong>
            </div>

            <div className="current-reading">
                <span>Humidity</span>

                <strong>
                    {environmentalGraphData.length > 0
                        ? environmentalGraphData[
                              environmentalGraphData.length - 1
                          ].humidity
                        : "--"}{" "}
                    %
                </strong>
            </div>

            <div className="current-reading">
                <span>Pressure</span>

                <strong>
                    {environmentalGraphData.length > 0
                        ? environmentalGraphData[
                              environmentalGraphData.length - 1
                          ].pressure
                        : "--"}{" "}
                    hPa
                </strong>
            </div>
        </div>

        <div className="telemetry-chart">
            <div className="chart-header">
                <div>
                    <h3>Environmental Telemetry</h3>

                    <p>
                        Live temperature readings from{" "}
                        {selectedSensor.deviceIdentifier}
                    </p>
                </div>

                <span className="live-indicator">
                    ● Live
                </span>
            </div>

            <ResponsiveContainer
                width="100%"
                height={350}
            >
                <LineChart
                    data={environmentalGraphData}
                    margin={{
                        top: 20,
                        right: 20,
                        left: 0,
                        bottom: 10,
                    }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                    />

                    <XAxis
                        dataKey="time"
                    />

                    <YAxis />

                    <Tooltip />

                    <Line
                        type="monotone"
                        dataKey="temperature"
                        name="Temperature"
                        strokeWidth={3}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
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
            </main>
        </div>
    );
}

export default App;