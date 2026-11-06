import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { Icon } from "../components/Icons";
import { getSensors, type Sensor } from "../services/api";
import {
    getAlertStatus,
    getAlerts,
    getCommandHistory,
    getCommandStates,
    getInsights,
    getProcessingLog,
    getTimeline,
    issueCommand,
    recordSearch,
    undoCommand,
    type AlertStatus,
    type DeviceCommand,
    type InsightsResponse,
    type ProcessingEvent,
    type StreamAlert,
    type Suggestion,
    type TimelinePacket,
} from "../services/commandApi";
import {
    PUMP_DEVICE,
    SENSOR_DEVICE,
    SPIKE_DEVICE,
    injectPowerSpike,
    runStressTest,
    sendOneReading,
    sendReadingsForAll,
    setActuatorStates,
    startDrought,
} from "../services/deviceSimulator";

// Which fields of each category are drawn on the live chart.
const CHART_LINES: Record<string, { key: string; label: string; color: string }[]> = {
    Environmental: [
        { key: "temperature", label: "Temperature (°C)", color: "#2d3748" },
        { key: "humidity", label: "Moisture (%)", color: "#4fd1c5" },
    ],
    PowerConsumption: [
        { key: "power", label: "Power (W)", color: "#4fd1c5" },
    ],
    Actuator: [{ key: "value", label: "Output (%)", color: "#4fd1c5" }],
};

type AlertState = "Alerting" | "Disconnected" | "Healthy";

// Pre-defined override buttons. "RelayToggle" flips between On and Off.
const COMMAND_BUTTONS = [
    { name: "PumpOn", label: "Pump On", state: "On" },
    { name: "PumpOff", label: "Pump Off", state: "Off" },
    { name: "RelayToggle", label: "Toggle Relay", state: "" },
];

const EMPTY_STATUS: AlertStatus = {
    disconnectedNodes: [],
    activeAlertKeys: [],
    telemetryQueueDepth: 0,
    criticalQueueDepth: 0,
};

const EMPTY_INSIGHTS: InsightsResponse = {
    suggestions: [],
    insights: [],
    patterns: [],
    actionsRecorded: 0,
};

function PillarHeading({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="section-heading">
            <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
            </div>
        </div>
    );
}

function CommandStreamPage() {
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [alerts, setAlerts] = useState<StreamAlert[]>([]);
    const [status, setStatus] = useState<AlertStatus>(EMPTY_STATUS);
    const [history, setHistory] = useState<DeviceCommand[]>([]);
    const [states, setStates] = useState<Record<string, string>>({});
    const [insights, setInsights] = useState<InsightsResponse>(EMPTY_INSIGHTS);
    const [timeline, setTimeline] = useState<TimelinePacket[]>([]);

    const [selectedId, setSelectedId] = useState<string>("");
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [stateFilter, setStateFilter] = useState("All");

    const [commandTarget, setCommandTarget] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Simulator: on by default so the dashboard is alive when it opens.
    const [simulating, setSimulating] = useState(true);
    const sensorsRef = useRef<Sensor[]>([]);
    const lastRecordedSearch = useRef("");

    // Stress test: processing log + queue depth sampled while it runs.
    const [log, setLog] = useState<ProcessingEvent[]>([]);
    const [trace, setTrace] = useState<{ t: number; depth: number }[]>([]);
    const [stressRunning, setStressRunning] = useState(false);
    const latestDepth = useRef(0);

    // ---------------------------------------------------------------
    // POLLING: refresh everything every 2 seconds (all calls in parallel).
    // ---------------------------------------------------------------
    const refresh = useCallback(async () => {
        const results = await Promise.allSettled([
            getSensors(),
            getAlerts(),
            getAlertStatus(),
            getCommandHistory(),
            getCommandStates(),
            getInsights(),
            getProcessingLog(),
        ]);

        const [s, a, st, h, cs, ins, lg] = results;

        if (lg.status === "fulfilled") setLog(lg.value);

        if (s.status === "fulfilled") {
            setSensors(s.value);
            sensorsRef.current = s.value;
        }
        if (a.status === "fulfilled") setAlerts(a.value);
        if (st.status === "fulfilled") setStatus(st.value);
        if (h.status === "fulfilled") setHistory(h.value);
        if (cs.status === "fulfilled") {
            setStates(cs.value);
            // The simulated pump/soil react to the commands the operator sends.
            setActuatorStates(cs.value);
        }
        if (ins.status === "fulfilled") setInsights(ins.value);

        setError(
            results.every((r) => r.status === "rejected")
                ? "Unable to reach the Smart-X API."
                : null
        );
    }, []);

    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, 2000);
        return () => clearInterval(timer);
    }, [refresh]);

    // Default selections once devices are known.
    useEffect(() => {
        if (sensors.length === 0) return;

        setSelectedId((current) => current || sensors[0].deviceIdentifier);

        setCommandTarget((current) => {
            if (current) return current;
            // Prefer the greenhouse pump, otherwise the first actuator.
            const actuator =
                sensors.find((x) => x.deviceIdentifier === PUMP_DEVICE) ??
                sensors.find((x) => x.category === "Actuator");
            return actuator?.deviceIdentifier ?? "";
        });
    }, [sensors]);

    // Timeline of the selected device (already sorted by the API).
    useEffect(() => {
        if (!selectedId) return;

        let cancelled = false;

        const load = async () => {
            try {
                const data = await getTimeline(selectedId);
                if (!cancelled) setTimeline(data);
            } catch {
                /* the next tick will retry */
            }
        };

        load();
        const timer = setInterval(load, 2000);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [selectedId]);

    // ---------------------------------------------------------------
    // SIMULATOR: sends readings like real devices would.
    // ---------------------------------------------------------------
    useEffect(() => {
        if (!simulating) return;

        const timer = setInterval(() => {
            if (sensorsRef.current.length > 0) {
                sendReadingsForAll(sensorsRef.current);
            }
        }, 2000);

        return () => clearInterval(timer);
    }, [simulating]);

    // ---------------------------------------------------------------
    // SEARCH: report the search to the engine once the user stops typing.
    // ---------------------------------------------------------------
    useEffect(() => {
        const text = search.trim();

        if (text.length < 2 || text === lastRecordedSearch.current) return;

        const timer = setTimeout(() => {
            lastRecordedSearch.current = text;
            recordSearch(text).catch(() => undefined);
        }, 1500);

        return () => clearTimeout(timer);
    }, [search]);

    // ---------------------------------------------------------------
    // FILTERING
    // ---------------------------------------------------------------
    const alertStateOf = useCallback(
        (id: string): AlertState => {
            if (status.disconnectedNodes.some((n) => n.toLowerCase() === id.toLowerCase())) {
                return "Disconnected";
            }
            if (status.activeAlertKeys.some((k) => k.toLowerCase().startsWith(id.toLowerCase() + ":"))) {
                return "Alerting";
            }
            return "Healthy";
        },
        [status]
    );

    const visibleSensors = useMemo(() => {
        const text = search.trim().toLowerCase();

        return sensors.filter((s) => {
            const matchesText =
                text === "" ||
                [s.deviceIdentifier, s.deploymentLocation, s.macAddress, s.category]
                    .some((field) => field.toLowerCase().includes(text));

            const matchesCategory =
                categoryFilter === "All" || s.category === categoryFilter;

            const matchesState =
                stateFilter === "All" || alertStateOf(s.deviceIdentifier) === stateFilter;

            return matchesText && matchesCategory && matchesState;
        });
    }, [sensors, search, categoryFilter, stateFilter, alertStateOf]);

    const selected = sensors.find((s) => s.deviceIdentifier === selectedId);
    const actuators = sensors.filter((s) => s.category === "Actuator");

    // ---------------------------------------------------------------
    // CHART DATA
    // ---------------------------------------------------------------
    const chartLines = CHART_LINES[selected?.category ?? "Environmental"] ?? [];

    const chartData = timeline.slice(-60).map((p) => ({
        time: new Date(p.timestamp).toLocaleTimeString([], {
            minute: "2-digit",
            second: "2-digit",
        }),
        ...Object.fromEntries(
            chartLines.map((l) => [l.key, typeof p.data[l.key] === "number" ? p.data[l.key] : null])
        ),
    }));

    // ---------------------------------------------------------------
    // ACTIONS
    // ---------------------------------------------------------------
    async function runCommand(deviceIdentifier: string, commandName: string, newState: string) {
        setMessage(null);

        try {
            let state = newState;

            // Relay toggle: flip whatever the device is currently set to.
            if (!state) {
                state = (states[deviceIdentifier] ?? "Off") === "On" ? "Off" : "On";
            }

            await issueCommand({ deviceIdentifier, commandName, newState: state });
            setMessage(`Sent '${commandName}' to ${deviceIdentifier} (${state}).`);
            await refresh();
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Command failed.");
        }
    }

    async function handleUndo() {
        try {
            const result = await undoCommand();
            setMessage(result.message);
            await refresh();
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Undo failed.");
        }
    }

    function applySuggestion(s: Suggestion) {
        if (s.kind === "Command") {
            runCommand(s.deviceIdentifier, s.commandName, s.newState || "On");
        } else {
            setSearch(s.searchText);
        }
    }

    // Power spike: a few identical bad packets in a row, which still raise
    // only ONE alert (the HashSet blocks the duplicates).
    async function triggerPowerSpike() {
        const sensor = sensors.find((s) => s.deviceIdentifier === SPIKE_DEVICE);

        if (!sensor) {
            setMessage(`Device ${SPIKE_DEVICE} is not registered.`);
            return;
        }

        injectPowerSpike(3);
        await sendOneReading(sensor);
        setMessage(`Power spike (3800 W) injected on ${SPIKE_DEVICE}.`);
        setTimeout(refresh, 400);
    }

    // Stress test: 150 readings arrive faster than the API processes them,
    // then ONE power spike is sent last. The queue depth is sampled every
    // 300 ms so the backlog and the spike jumping the line are visible.
    async function handleStressTest() {
        if (stressRunning) return;

        setStressRunning(true);
        setTrace([]);
        setMessage("Stress test running: 150 normal readings, then 1 critical power spike.");

        const startedAt = Date.now();

        const sampler = setInterval(async () => {
            try {
                const [st, lg] = await Promise.all([getAlertStatus(), getProcessingLog()]);

                latestDepth.current = st.telemetryQueueDepth;
                setStatus(st);
                setLog(lg);
                setTrace((previous) => [
                    ...previous,
                    {
                        t: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
                        depth: st.telemetryQueueDepth,
                    },
                ]);
            } catch {
                /* the next sample will retry */
            }
        }, 300);

        await runStressTest(sensorsRef.current, 150);

        // Keep sampling until the queue has drained (or 15 s have passed).
        await new Promise<void>((resolve) => {
            const watcher = setInterval(() => {
                const elapsed = Date.now() - startedAt;

                if (elapsed > 15000 || (latestDepth.current === 0 && elapsed > 2500)) {
                    clearInterval(watcher);
                    resolve();
                }
            }, 300);
        });

        clearInterval(sampler);
        setStressRunning(false);
        setMessage("Stress test finished. Read the Processing Log below to see the order.");
        refresh();
    }

    // Dry soil: moisture keeps falling until the pump is switched on.
    async function triggerDrySoil() {
        const sensor = sensors.find((s) => s.deviceIdentifier === SENSOR_DEVICE);

        if (!sensor) {
            setMessage(`Device ${SENSOR_DEVICE} is not registered.`);
            return;
        }

        startDrought();
        await sendOneReading(sensor);
        setMessage(
            `Soil on ${SENSOR_DEVICE} is drying out. Switch ${PUMP_DEVICE} on to recover it.`
        );
        setTimeout(refresh, 400);
    }

    const stateBadge = (id: string) => {
        const s = alertStateOf(id);
        return <span className={`cs-badge cs-${s.toLowerCase()}`}>{s}</span>;
    };

    // ---------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------
    return (
        <main className="dashboard cs-page">
            {error && <div className="error-banner">{error}</div>}

            {/* QUEUE / STATUS STRIP */}
            <section className="cs-stats">
                <div className="cs-stat">
                    <span>Telemetry queue (FIFO)</span>
                    <strong>{status.telemetryQueueDepth}</strong>
                    <span className="cs-stat-icon"><Icon name="queue" size={22} /></span>
                </div>
                <div className={"cs-stat" + (status.criticalQueueDepth > 0 ? " danger" : "")}>
                    <span>Critical queue (priority)</span>
                    <strong>{status.criticalQueueDepth}</strong>
                    <span className="cs-stat-icon"><Icon name="bolt" size={22} /></span>
                </div>
                <div className={"cs-stat" + (status.disconnectedNodes.length > 0 ? " warn" : "")}>
                    <span>Disconnected nodes (set)</span>
                    <strong>{status.disconnectedNodes.length}</strong>
                    <span className="cs-stat-icon"><Icon name="offline" size={22} /></span>
                </div>
                <div className={"cs-stat" + (status.activeAlertKeys.length > 0 ? " danger" : "")}>
                    <span>Active alerts (set)</span>
                    <strong>{status.activeAlertKeys.length}</strong>
                    <span className="cs-stat-icon"><Icon name="alert" size={22} /></span>
                </div>
                <div className="cs-stat">
                    <span>Undo stack</span>
                    <strong>{history.length}</strong>
                    <span className="cs-stat-icon"><Icon name="stack" size={22} /></span>
                </div>
            </section>

            {message && <div className="cs-message">{message}</div>}

            {/* SUGGESTED ACTIONS + AUTOMATED INSIGHTS */}
            <section className="cs-two-col">
                <div className="cs-panel cs-suggest">
                    <PillarHeading
                        title="Suggested Actions"
                        subtitle={`Learned from ${insights.actionsRecorded} recorded actions`}
                    />

                    {insights.suggestions.length === 0 ? (
                        <p className="cs-empty">
                            No patterns triggered right now. Suggestions appear
                            when a situation you have handled before happens again.
                        </p>
                    ) : (
                        <ul className="cs-list">
                            {insights.suggestions.map((s) => (
                                <li key={s.kind + s.title} className="cs-suggestion">
                                    <div>
                                        <strong>{s.title}</strong>
                                        <p>{s.reason}</p>
                                        <div className="cs-bar">
                                            <div style={{ width: `${Math.round(s.confidence * 100)}%` }} />
                                        </div>
                                        <small>{Math.round(s.confidence * 100)}% confidence</small>
                                    </div>
                                    <button type="button" onClick={() => applySuggestion(s)}>
                                        {s.kind === "Command" ? "Run" : "Search"}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {insights.patterns.length > 0 && (
                        <details className="cs-patterns">
                            <summary>Learned patterns ({insights.patterns.length})</summary>
                            <ul>
                                {insights.patterns.map((p) => (
                                    <li key={p.trigger + p.next}>
                                        {p.trigger} → {p.next} <b>×{p.count}</b>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>

                <div className="cs-panel">
                    <PillarHeading
                        title="Automated Insights"
                        subtitle="Faulty or out-of-range devices, found before you search"
                    />

                    {insights.insights.length === 0 ? (
                        <p className="cs-empty">All devices are reporting normally.</p>
                    ) : (
                        <ul className="cs-list">
                            {insights.insights.map((i) => (
                                <li
                                    key={i.deviceIdentifier + i.title}
                                    className={`cs-insight sev-${i.severity}`}
                                    onClick={() => setSelectedId(i.deviceIdentifier)}
                                >
                                    <strong>
                                        {i.deviceIdentifier}: {i.title}
                                    </strong>
                                    <p>{i.detail}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            {/* DEVICE GRID WITH SEARCH + FILTERS */}
            <section className="cs-panel">
                <PillarHeading
                    title="Devices"
                    subtitle="Search or filter by category or alert state"
                />

                <div className="cs-filters">
                    <input
                        type="search"
                        placeholder="Search name, location, MAC (e.g. Pump A)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="All">All categories</option>
                        <option value="Environmental">Environmental</option>
                        <option value="PowerConsumption">Power Consumption</option>
                        <option value="Actuator">Actuator</option>
                    </select>

                    <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                        <option value="All">All alert states</option>
                        <option value="Alerting">Alerting</option>
                        <option value="Disconnected">Disconnected</option>
                        <option value="Healthy">Healthy</option>
                    </select>
                </div>

                <div className="cs-grid">
                    {visibleSensors.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            className={
                                "cs-device" +
                                (s.deviceIdentifier === selectedId ? " selected" : "")
                            }
                            onClick={() => setSelectedId(s.deviceIdentifier)}
                        >
                            <div className="cs-device-top">
                                <strong>{s.deviceIdentifier}</strong>
                                {stateBadge(s.deviceIdentifier)}
                            </div>
                            <span>{s.deploymentLocation}</span>
                            <small>
                                {s.category}
                                {states[s.deviceIdentifier] && ` · ${states[s.deviceIdentifier]}`}
                            </small>
                        </button>
                    ))}

                    {visibleSensors.length === 0 && (
                        <p className="cs-empty">No devices match this search or filter.</p>
                    )}
                </div>
            </section>

            {/* LIVE CHART */}
            <section className="cs-panel">
                <PillarHeading
                    title={selected ? `Live telemetry: ${selected.deviceIdentifier}` : "Live telemetry"}
                    subtitle="Readings are served in timestamp order by the SortedDictionary timeline"
                />

                {chartData.length === 0 ? (
                    <p className="cs-empty">Waiting for readings from this device...</p>
                ) : (
                    <div className="cs-chart">
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip />
                                {chartLines.map((l) => (
                                    <Line
                                        key={l.key}
                                        type="monotone"
                                        dataKey={l.key}
                                        name={l.label}
                                        stroke={l.color}
                                        dot={false}
                                        isAnimationActive={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </section>

            {/* COMMANDS + HISTORY */}
            <section className="cs-two-col">
                <div className="cs-panel">
                    <PillarHeading
                        title="Manual Override"
                        subtitle="Send a command to an actuator. Undo reverts the latest one."
                    />

                    <div className="cs-filters">
                        <select value={commandTarget} onChange={(e) => setCommandTarget(e.target.value)}>
                            {actuators.map((a) => (
                                <option key={a.id} value={a.deviceIdentifier}>
                                    {a.deviceIdentifier} - {a.deploymentLocation}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="cs-buttons">
                        {COMMAND_BUTTONS.map((c) => (
                            <button
                                key={c.name}
                                type="button"
                                disabled={!commandTarget}
                                onClick={() => runCommand(commandTarget, c.name, c.state)}
                            >
                                {c.label}
                            </button>
                        ))}

                        <button type="button" className="cs-undo" onClick={handleUndo}>
                            ↶ Undo last command
                        </button>
                    </div>

                    <ul className="cs-list cs-history">
                        {history.length === 0 && <li className="cs-empty">No commands issued yet.</li>}

                        {history.map((c, index) => (
                            <li key={c.commandId}>
                                <strong>{c.commandName}</strong> on {c.deviceIdentifier}:{" "}
                                {c.previousState} → {c.newState}
                                <small>
                                    {new Date(c.issuedAt).toLocaleTimeString()}
                                    {index === 0 && " · next to undo"}
                                </small>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="cs-panel">
                    <PillarHeading
                        title="Critical Alert Feed"
                        subtitle="Each problem appears once (duplicates blocked by the HashSet)"
                    />

                    <ul className="cs-list cs-alerts">
                        {alerts.length === 0 && <li className="cs-empty">No alerts raised.</li>}

                        {alerts.map((a) => (
                            <li key={a.alertId} className={`sev-${a.severity}`}>
                                <strong>
                                    {a.deviceIdentifier} · {a.alertType}
                                </strong>
                                <p>{a.message}</p>
                                <small>{new Date(a.timestamp).toLocaleTimeString()}</small>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* QUEUE STRESS TEST */}
            <section className="cs-panel">
                <PillarHeading
                    title="Queue Stress Test"
                    subtitle="150 readings arrive at once, then one critical power spike is sent LAST"
                />

                <p className="cs-explain">
                    Readings are queued first-in, first-out and processed at
                    about 50 per second, so a burst creates a backlog. A
                    critical alert goes on the priority queue instead and is
                    handled on the very next tick, ahead of every reading still
                    waiting.
                </p>

                <div className="cs-buttons">
                    <button type="button" className="cs-danger" disabled={stressRunning} onClick={handleStressTest}>
                        {stressRunning ? "Running..." : "🚀 Run stress test"}
                    </button>
                </div>

                <div className="cs-two-col">
                    <div>
                        <h3 className="cs-subhead">Telemetry queue depth (live)</h3>

                        {trace.length === 0 ? (
                            <p className="cs-empty">Run the test to see the backlog build and drain.</p>
                        ) : (
                            <div className="cs-chart">
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={trace}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="t" unit="s" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Area
                                            type="monotone"
                                            dataKey="depth"
                                            name="Readings waiting"
                                            stroke="#319795"
                                            fill="#4fd1c5"
                                            fillOpacity={0.35}
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="cs-subhead">Processing log (newest first)</h3>

                        <ul className="cs-list cs-processing">
                            {log.length === 0 && <li className="cs-empty">Nothing processed under load yet.</li>}

                            {log.map((e) => (
                                <li
                                    key={e.sequence}
                                    className={e.kind === "Critical alert" ? "sev-1" : ""}
                                >
                                    <strong>
                                        #{e.sequence} · {e.kind}
                                    </strong>
                                    <p>{e.message}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* SIMULATOR */}
            <section className="cs-panel">
                <PillarHeading
                    title="Device Simulator"
                    subtitle="Sends readings to the API like real ESP32 nodes. Dry soil only recovers while Pump A is on. TEMP-002 stays silent on purpose."
                />

                <div className="cs-buttons">
                    <button type="button" onClick={() => setSimulating((v) => !v)}>
                        {simulating ? "Pause simulator" : "Start simulator"}
                    </button>

                    <button
                        type="button"
                        className="cs-danger"
                        onClick={triggerPowerSpike}
                    >
                        ⚡ Simulate power spike
                    </button>

                    <button
                        type="button"
                        className="cs-danger"
                        onClick={triggerDrySoil}
                    >
                        💧 Simulate dry soil
                    </button>
                </div>
            </section>
        </main>
    );
}

export default CommandStreamPage;
