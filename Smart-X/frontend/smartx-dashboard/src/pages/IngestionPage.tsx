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
    sendPowerTelemetry,
    sendActuatorTelemetry,
    type HealthResponse,
    type Sensor,
    type SensorMedia,
    type ReportedIssue,
    type TelemetryPacket,
    type EnvironmentalTelemetry,
    type PowerConsumptionTelemetry,
    type ActuatorTelemetry
} from "../services/api";

const CHART_FIELD: Record<
    string,
    { key: string; label: string; unit: string }
> = {
    Environmental: {
        key: "temperature",
        label: "Temperature",
        unit: "°C"
    },
    PowerConsumption: {
        key: "power",
        label: "Power",
        unit: "W"
    },
    Actuator: {
        key: "value",
        label: "Value",
        unit: ""
    }
};

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

// PILLAR 1: Sensor Data Ingestion & Telemetry (Part 1).
// The header and navigation menu now live in App.tsx; this page is only
// the ingestion module itself.
function IngestionPage() {
    const [, setHealth] = useState<HealthResponse | null>(null);
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

    // DYNAMIC ENGAGEMENT: these values are recalculated on every render,
    // so the "Attention Required" banner appears/disappears automatically
    // as sensors go offline or issues are resolved.
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

    // The device + category the simulator is currently sending to.
    // Locked in when the simulator starts, so switching the selected
    // sensor mid-run doesn't change where readings are sent.
    const [simulatorTarget, setSimulatorTarget] = useState<{
        deviceIdentifier: string;
        category: string;
    } | null>(null);

    const [simulatedEnvironmental, setSimulatedEnvironmental] =
        useState<EnvironmentalTelemetry>({
            temperature: 23.5,
            humidity: 48.2,
            pressure: 1012.4,
        });

    const [simulatedPower, setSimulatedPower] =
        useState<PowerConsumptionTelemetry>({
            voltage: 230.4,
            current: 4.8,
            power: 1105.9,
            energyConsumed: 14.7,
        });

    const [simulatedActuator, setSimulatedActuator] =
        useState<ActuatorTelemetry>({
            state: "Running",
            value: 72,
        });

    const simulatedEnvironmentalRef =
        useRef<EnvironmentalTelemetry>(simulatedEnvironmental);

    const simulatedPowerRef =
        useRef<PowerConsumptionTelemetry>(simulatedPower);

    const simulatedActuatorRef =
        useRef<ActuatorTelemetry>(simulatedActuator);

    const simulationIntervalRef =
        useRef<ReturnType<typeof setInterval> | null>(null);
    // STARTUP: runs once when the dashboard opens.
    // Loads health, sensors and issues from the API at the same time
    // (Promise.all), then refreshes them every 10 seconds.
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

        // Cleanup: stop the timer if the component is removed.
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

    // LIVE TELEMETRY: when a sensor is selected, fetch its readings
    // every 3 seconds so the chart updates in near real time.
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
    // Telemetry is rendered based on the *selected sensor's* category,
    // not hardcoded to Environmental, so Power/Actuator sensors show
    // their own readings instead of an empty temperature chart.
    const selectedCategory =
        selectedSensor?.category ?? "Environmental";

    const categoryTelemetry = telemetry.filter(
        (packet) => packet.telemetryType === selectedCategory
    );

    const latestReading =
        categoryTelemetry.length > 0
            ? categoryTelemetry[categoryTelemetry.length - 1].data
            : null;

    const chartField =
        CHART_FIELD[selectedCategory] ?? CHART_FIELD.Environmental;

    const telemetryGraphData = categoryTelemetry.map((packet) => {
        const data = packet.data as Record<string, unknown>;

        const rawValue = data[chartField.key];

        return {
            time: new Date(packet.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }),

            [chartField.key]:
                typeof rawValue === "number" ? rawValue : null,
        };
    });
    // SENSOR SIMULATOR (acts like a real ESP32 device).
    // Takes the previous reading and nudges it by a small random amount,
    // so values drift realistically instead of jumping around, then POSTs
    // it to the matching API endpoint for the sensor's category.
    async function generateSimulatedReading(
        target: { deviceIdentifier: string; category: string }
    ) {
        try {
            if (target.category === "PowerConsumption") {
                const current = simulatedPowerRef.current;

                const nextReading: PowerConsumptionTelemetry = {
                    voltage: Number(
                        (current.voltage + (Math.random() * 2 - 1) * 2).toFixed(1)
                    ),
                    current: Number(
                        Math.max(
                            0,
                            current.current + (Math.random() * 2 - 1) * 0.3
                        ).toFixed(2)
                    ),
                    power: Number(
                        Math.max(
                            0,
                            current.power + (Math.random() * 2 - 1) * 40
                        ).toFixed(1)
                    ),
                    energyConsumed: Number(
                        (current.energyConsumed + Math.random() * 0.05).toFixed(2)
                    ),
                };

                simulatedPowerRef.current = nextReading;
                setSimulatedPower(nextReading);

                await sendPowerTelemetry({
                    packetId: crypto.randomUUID(),
                    deviceIdentifier: target.deviceIdentifier,
                    timestamp: new Date().toISOString(),
                    telemetryType: "PowerConsumption",
                    data: nextReading,
                });
            } else if (target.category === "Actuator") {
                const current = simulatedActuatorRef.current;

                const states = ["Running", "Idle", "Stopped"];

                const nextReading: ActuatorTelemetry = {
                    state:
                        Math.random() < 0.15
                            ? states[
                            Math.floor(Math.random() * states.length)
                            ]
                            : current.state,
                    value: Number(
                        Math.max(
                            0,
                            Math.min(
                                100,
                                current.value + (Math.random() * 2 - 1) * 5
                            )
                        ).toFixed(1)
                    ),
                };

                simulatedActuatorRef.current = nextReading;
                setSimulatedActuator(nextReading);

                await sendActuatorTelemetry({
                    packetId: crypto.randomUUID(),
                    deviceIdentifier: target.deviceIdentifier,
                    timestamp: new Date().toISOString(),
                    telemetryType: "Actuator",
                    data: nextReading,
                });
            } else {
                const current = simulatedEnvironmentalRef.current;

                const nextReading: EnvironmentalTelemetry = {
                    temperature: Number(
                        (current.temperature + (Math.random() * 2 - 1) * 0.5).toFixed(1)
                    ),
                    humidity: Number(
                        Math.max(
                            0,
                            Math.min(
                                100,
                                current.humidity + (Math.random() * 2 - 1) * 1
                            )
                        ).toFixed(1)
                    ),
                    pressure: Number(
                        (current.pressure + (Math.random() * 2 - 1) * 0.5).toFixed(1)
                    ),
                };

                simulatedEnvironmentalRef.current = nextReading;
                setSimulatedEnvironmental(nextReading);

                await sendEnvironmentalTelemetry({
                    packetId: crypto.randomUUID(),
                    deviceIdentifier: target.deviceIdentifier,
                    timestamp: new Date().toISOString(),
                    telemetryType: "Environmental",
                    data: nextReading,
                });
            }

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

    // Sends one reading immediately, then another every 3 seconds.
    function startSimulator() {
        if (simulationIntervalRef.current || !selectedSensor) {
            return;
        }

        const target = {
            deviceIdentifier: selectedSensor.deviceIdentifier,
            category: selectedSensor.category,
        };

        setSimulatorTarget(target);
        setIsSimulating(true);
        setSimulationCount(0);

        generateSimulatedReading(target);

        simulationIntervalRef.current = setInterval(
            () => generateSimulatedReading(target),
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
        // Stop the browser reloading the page on submit.
        event.preventDefault();

        setError(null);
        setRegistrationMessage(null);

        // CLIENT-SIDE VALIDATION: catch mistakes instantly before calling
        // the API. The API validates again on the server.
        if (!deviceIdentifier.trim()) {
            setError("Device identifier is required.");
            return;
        }

        // Six pairs of hex digits separated by colons, e.g. AA:BB:CC:DD:EE:01.
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

            // Add the new sensor to the screen straight away (no reload needed).
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

        <>
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
                                    {selectedSensor
                                        ? `Simulate live telemetry from ${selectedSensor.deviceIdentifier}`
                                        : "Select a sensor below to simulate live telemetry"}
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
                                <strong>
                                    {simulatorTarget?.deviceIdentifier ??
                                        selectedSensor?.deviceIdentifier ??
                                        "None selected"}
                                </strong>
                            </div>

                            {(simulatorTarget?.category ?? selectedSensor?.category) ===
                                "PowerConsumption" ? (
                                <>
                                    <div className="simulator-info">
                                        <span>Voltage</span>
                                        <strong>{simulatedPower.voltage} V</strong>
                                    </div>
                                    <div className="simulator-info">
                                        <span>Current</span>
                                        <strong>{simulatedPower.current} A</strong>
                                    </div>
                                    <div className="simulator-info">
                                        <span>Power</span>
                                        <strong>{simulatedPower.power} W</strong>
                                    </div>
                                    <div className="simulator-info">
                                        <span>Energy Consumed</span>
                                        <strong>
                                            {simulatedPower.energyConsumed} kWh
                                        </strong>
                                    </div>
                                </>
                            ) : (simulatorTarget?.category ?? selectedSensor?.category) ===
                                "Actuator" ? (
                                <>
                                    <div className="simulator-info">
                                        <span>State</span>
                                        <strong>{simulatedActuator.state}</strong>
                                    </div>
                                    <div className="simulator-info">
                                        <span>Value</span>
                                        <strong>{simulatedActuator.value}</strong>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="simulator-info">
                                        <span>Temperature</span>
                                        <strong>
                                            {simulatedEnvironmental.temperature} °C
                                        </strong>
                                    </div>
                                    <div className="simulator-info">
                                        <span>Humidity</span>
                                        <strong>
                                            {simulatedEnvironmental.humidity} %
                                        </strong>
                                    </div>
                                    <div className="simulator-info">
                                        <span>Pressure</span>
                                        <strong>
                                            {simulatedEnvironmental.pressure} hPa
                                        </strong>
                                    </div>
                                </>
                            )}

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
                                disabled={isSimulating || !selectedSensor}
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
                        ) : categoryTelemetry.length === 0 ? (
                            <div className="empty-state">
                                <p>
                                    No telemetry data available for {selectedSensor.deviceIdentifier} yet.
                                    Start the simulator above to generate live readings.
                                </p>
                            </div>
                        ) : (
                            <div className="telemetry-panel">

                                <div className="telemetry-current">
                                    {renderTelemetryData(selectedCategory, latestReading)}
                                </div>

                                <div className="telemetry-chart">
                                    <div className="chart-header">
                                        <div>
                                            <h3>{chartField.label} Telemetry</h3>

                                            <p>
                                                Live {chartField.label.toLowerCase()} readings from{" "}
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
                                            data={telemetryGraphData}
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

                                            <YAxis
                                                unit={chartField.unit ? ` ${chartField.unit}` : ""}
                                            />

                                            <Tooltip />

                                            <Line
                                                type="monotone"
                                                dataKey={chartField.key}
                                                name={chartField.label}
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
        </>
    );
}

export default IngestionPage;
