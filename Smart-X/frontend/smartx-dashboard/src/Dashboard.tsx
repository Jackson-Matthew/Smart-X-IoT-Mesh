import { useEffect, useState } from "react";

import { Icon, type IconName } from "./components/Icons";
import { Logo } from "./components/Logo";
import CommandStreamPage from "./pages/CommandStreamPage";
import IngestionPage from "./pages/IngestionPage";
import MeshTopologyPage from "./pages/MeshTopologyPage";
import { getHealth, type HealthResponse } from "./services/api";
import "./purity.css";

// DASHBOARD SHELL (shown only after sign-in), laid out like the Purity UI
// dashboard: floating sidebar on the left, top bar with breadcrumb on the right.
//
// Both active pages stay MOUNTED and are only hidden when you switch tabs
// (the `hidden` attribute). Because they are never unmounted, their state,
// timers and simulators survive navigation: nothing reloads or is lost.
type Pillar = "ingestion" | "command" | "topology";

const PILLARS: {
    id: Pillar;
    label: string;
    short: string;
    icon: IconName;
    enabled: boolean;
}[] = [
    {
        id: "ingestion",
        label: "Sensor Data Ingestion & Telemetry",
        short: "Telemetry Ingestion",
        icon: "devices",
        enabled: true,
    },
    {
        id: "command",
        label: "Real-Time Command Stream & History",
        short: "Command Stream",
        icon: "bolt",
        enabled: true,
    },
    {
        id: "topology",
        label: "Network Topology & Mesh Routing",
        short: "Mesh Topology",
        icon: "mesh",
        enabled: true,
    },
];

function Dashboard({
    email,
    onSignOut,
}: {
    email: string;
    onSignOut: () => void;
}) {
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

    const current = PILLARS.find((p) => p.id === active)!;

    return (
        <div className="px-shell">
            <aside className="px-sidebar">
                <div className="px-brand">
                    <Logo />
                </div>

                <hr className="px-rule" />

                <p className="px-nav-title">Modules</p>

                <nav className="px-nav">
                    {PILLARS.map((pillar) => (
                        <button
                            key={pillar.id}
                            type="button"
                            disabled={!pillar.enabled}
                            title={pillar.label}
                            className={
                                "px-nav-item" +
                                (active === pillar.id ? " active" : "")
                            }
                            onClick={() => pillar.enabled && setActive(pillar.id)}
                        >
                            <span className="px-nav-icon">
                                <Icon name={pillar.icon} />
                            </span>
                            <span className="px-nav-label">{pillar.short}</span>
                            {!pillar.enabled && <span className="px-soon">Soon</span>}
                        </button>
                    ))}
                </nav>

                <div className="px-help">
                    <span className="px-help-icon">
                        <Icon name="shield" size={20} />
                    </span>
                    <strong>Gateway</strong>
                    <p>
                        <span
                            className={health ? "status-dot online" : "status-dot offline"}
                        />
                        {health ? "Online and receiving" : "Offline"}
                    </p>
                    <button type="button" onClick={onSignOut}>
                        Sign out
                    </button>
                </div>
            </aside>

            <div className="px-main">
                <header className="px-topbar">
                    <div>
                        <p className="px-crumb">
                            Pages / <b>{current.short}</b>
                        </p>
                        <h1>{current.label}</h1>
                    </div>

                    <div className="px-top-actions">
                        <span className="px-status">
                            <span
                                className={health ? "status-dot online" : "status-dot offline"}
                            />
                            Gateway <strong>{health ? "Online" : "Offline"}</strong>
                        </span>

                        <span className="px-user" title={email}>
                            <Icon name="user" size={16} />
                            <span>{email}</span>
                        </span>

                        <button type="button" className="px-signout" onClick={onSignOut}>
                            <Icon name="logout" size={16} />
                            <span>Sign out</span>
                        </button>
                    </div>
                </header>

                <div hidden={active !== "ingestion"}>
                    <IngestionPage />
                </div>

                <div hidden={active !== "command"}>
                    <CommandStreamPage />
                </div>

                <div hidden={active !== "topology"}>
                    <MeshTopologyPage />
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
