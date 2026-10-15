import { useEffect, useState } from "react";

import { getHealth, type HealthResponse } from "./services/api";
import CommandStreamPage from "./pages/CommandStreamPage";
import IngestionPage from "./pages/IngestionPage";

// APP SHELL: header + navigation for the three architectural pillars.
//
// Both active pages stay MOUNTED and are only hidden when you switch tabs
// (the `hidden` attribute). Because they are never unmounted, their state,
// timers and simulators survive navigation: nothing reloads or is lost.
type Pillar = "ingestion" | "command" | "topology";

const PILLARS: { id: Pillar; label: string; enabled: boolean }[] = [
    { id: "ingestion", label: "Sensor Data Ingestion & Telemetry", enabled: true },
    { id: "command", label: "Real-Time Command Stream & History", enabled: true },
    // Final PoE: visible but greyed out and not clickable.
    { id: "topology", label: "Network Topology & Mesh Routing", enabled: false },
];

function App() {
    const [active, setActive] = useState<Pillar>("ingestion");
    const [health, setHealth] = useState<HealthResponse | null>(null);

    // Gateway status light in the header.
    useEffect(() => {
        const check = () =>
            getHealth().then(setHealth).catch(() => setHealth(null));

        check();
        const timer = setInterval(check, 10000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="app">
            <header className="dashboard-header">
                <div>
                    <h1>Smart-X</h1>
                    <p>IoT Mesh Ecosystem</p>
                </div>

                <div className="gateway-status">
                    <span
                        className={health ? "status-dot online" : "status-dot offline"}
                    />
                    <span>
                        Gateway: <strong>{health ? "Online" : "Offline"}</strong>
                    </span>
                </div>
            </header>

            <nav className="main-nav">
                {PILLARS.map((pillar) => (
                    <button
                        key={pillar.id}
                        type="button"
                        disabled={!pillar.enabled}
                        className={
                            "main-nav-item" +
                            (active === pillar.id ? " active" : "") +
                            (!pillar.enabled ? " disabled" : "")
                        }
                        onClick={() => pillar.enabled && setActive(pillar.id)}
                    >
                        {pillar.label}
                        {!pillar.enabled && <span className="badge">Final PoE</span>}
                    </button>
                ))}
            </nav>

            <div hidden={active !== "ingestion"}>
                <IngestionPage />
            </div>

            <div hidden={active !== "command"}>
                <CommandStreamPage />
            </div>
        </div>
    );
}

export default App;
