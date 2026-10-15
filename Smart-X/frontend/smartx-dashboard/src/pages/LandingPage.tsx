import { Logo } from "../components/Logo";

// Animated mesh network for the hero: nodes pulse and data "packets" travel
// along the links to the central gateway (pure SVG + CSS, no images needed).
const NODES = [
    { id: "gw", x: 300, y: 180, r: 16, gateway: true },
    { id: "a", x: 110, y: 90, r: 9 },
    { id: "b", x: 170, y: 270, r: 9 },
    { id: "c", x: 470, y: 80, r: 9 },
    { id: "d", x: 500, y: 250, r: 9 },
    { id: "e", x: 300, y: 40, r: 7 },
    { id: "f", x: 60, y: 200, r: 7 },
    { id: "g", x: 390, y: 320, r: 7 },
];

const LINKS: [string, string][] = [
    ["gw", "a"], ["gw", "b"], ["gw", "c"], ["gw", "d"], ["gw", "e"],
    ["a", "f"], ["a", "e"], ["b", "f"], ["b", "g"], ["d", "g"], ["c", "e"],
];

function MeshHero() {
    const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

    return (
        <svg viewBox="0 0 580 360" className="mesh" role="img" aria-label="Animated IoT mesh network">
            {LINKS.map(([from, to], i) => (
                <line
                    key={i}
                    x1={byId[from].x}
                    y1={byId[from].y}
                    x2={byId[to].x}
                    y2={byId[to].y}
                    className="mesh-link"
                />
            ))}

            {LINKS.filter(([from]) => from === "gw").map(([, to], i) => (
                <circle key={i} r="3.5" className="mesh-packet">
                    <animateMotion
                        dur={`${2.2 + i * 0.5}s`}
                        repeatCount="indefinite"
                        path={`M${byId[to].x},${byId[to].y} L${byId.gw.x},${byId.gw.y}`}
                    />
                </circle>
            ))}

            {NODES.map((n) => (
                <g key={n.id}>
                    {n.gateway && <circle cx={n.x} cy={n.y} r={n.r + 8} className="mesh-halo" />}
                    <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.r}
                        className={n.gateway ? "mesh-node gateway" : "mesh-node"}
                    />
                </g>
            ))}
        </svg>
    );
}

const FEATURES = [
    {
        icon: "📡",
        title: "Telemetry ingestion",
        text: "Typed, validated readings from ESP32 nodes, with deployment trees checked recursively and logs or photos attached to each device.",
    },
    {
        icon: "⚡",
        title: "Real-time command stream",
        text: "FIFO processing for normal data, a priority lane for critical alerts, manual overrides with one-click undo.",
    },
    {
        icon: "🧠",
        title: "Predictive actions",
        text: "Learns what operators do after each alert and suggests the next step, while flagging faulty devices before you search.",
    },
    {
        icon: "🕸️",
        title: "Mesh topology",
        text: "Route visualisation and power-efficient paths across the mesh. Arriving in the final release.",
        soon: true,
    },
];

const USE_CASES = [
    ["🌱", "Hydroponic farms", "Moisture, nutrients and pump control"],
    ["🏢", "Real estate utilities", "Metering and consumption tracking"],
    ["🔌", "Smart grid installations", "Load, voltage and fault detection"],
];

// Public marketing page shown before sign-in.
function LandingPage({ onSignIn }: { onSignIn: () => void }) {
    return (
        <div className="landing">
            <header className="landing-nav">
                <Logo light />
                <nav>
                    <a href="#features">Features</a>
                    <a href="#use-cases">Use cases</a>
                    <button type="button" onClick={onSignIn}>
                        Sign in
                    </button>
                </nav>
            </header>

            <section className="hero">
                <div className="hero-text">
                    <span className="hero-pill">IoT operations platform</span>
                    <h1>
                        Command your IoT mesh <em>in real time</em>
                    </h1>
                    <p>
                        Smart-X ingests live telemetry from thousands of
                        distributed sensors, raises critical alerts the
                        moment they happen, and tells your operators what to
                        do next.
                    </p>

                    <div className="hero-actions">
                        <button type="button" className="btn-primary" onClick={onSignIn}>
                            Open the console
                        </button>
                        <a href="#features" className="btn-ghost">
                            See how it works
                        </a>
                    </div>

                    <ul className="hero-stats">
                        <li>
                            <strong>O(1)</strong>
                            <span>device lookup</span>
                        </li>
                        <li>
                            <strong>2 lanes</strong>
                            <span>normal and critical</span>
                        </li>
                        <li>
                            <strong>Live</strong>
                            <span>suggested actions</span>
                        </li>
                    </ul>
                </div>

                <div className="hero-visual">
                    <MeshHero />
                </div>
            </section>

            <section id="features" className="landing-section">
                <h2>One console for the whole ecosystem</h2>
                <p className="landing-lead">
                    Three modules, one connected workflow, from raw sensor
                    reading to operator action.
                </p>

                <div className="feature-grid">
                    {FEATURES.map((f) => (
                        <article key={f.title} className={"feature" + (f.soon ? " soon" : "")}>
                            <span className="feature-icon">{f.icon}</span>
                            <h3>
                                {f.title}
                                {f.soon && <small>Coming soon</small>}
                            </h3>
                            <p>{f.text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section id="use-cases" className="landing-section alt">
                <h2>Built for distributed environments</h2>

                <div className="usecase-grid">
                    {USE_CASES.map(([icon, title, text]) => (
                        <div key={title} className="usecase">
                            <span>{icon}</span>
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </div>
                    ))}
                </div>

                <button type="button" className="btn-primary" onClick={onSignIn}>
                    Sign in to get started
                </button>
            </section>

            <footer className="landing-footer">
                <Logo light />
                <p>© 2026 Smart-X IoT Mesh Ecosystem · PROG7312</p>
            </footer>
        </div>
    );
}

export default LandingPage;
