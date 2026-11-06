import { Logo } from "../components/Logo";

const MODULES = [
    {
        title: "Sensor Data Ingestion",
        text: "Register devices, import device lists, attach logs and photos, and watch live telemetry arrive from every sensor.",
    },
    {
        title: "Real-Time Command Stream",
        text: "Critical alerts jump the queue, operators can send overrides with one-click undo, and the system suggests the next action.",
    },
    {
        title: "Network Topology & Mesh Routing",
        text: "Visualise the mesh and find the most power-efficient route for data. Coming in the final release.",
        soon: true,
    },
];

// Public home page shown before sign-in. Deliberately simple: what Smart-X is,
// what it does, and two ways in (log in or sign up).
function LandingPage({
    onLogin,
    onSignUp,
}: {
    onLogin: () => void;
    onSignUp: () => void;
}) {
    return (
        <div className="landing">
            <header className="landing-nav">
                <Logo />

                <div className="landing-nav-actions">
                    <button type="button" className="btn-outline" onClick={onLogin}>
                        Log in
                    </button>
                    <button type="button" className="btn-teal" onClick={onSignUp}>
                        Sign up
                    </button>
                </div>
            </header>

            <main>
                <section className="landing-hero">
                    <span className="landing-pill">IoT operations platform</span>
                    <h1>Monitor and control your IoT devices in one place</h1>
                    <p>
                        Smart-X receives live readings from sensors across
                        farms, buildings and power grids, raises critical
                        alerts the moment they happen, and suggests what to
                        do next.
                    </p>

                    <div className="landing-cta">
                        <button type="button" className="btn-teal btn-large" onClick={onLogin}>
                            Log in
                        </button>
                        <button type="button" className="btn-outline btn-large" onClick={onSignUp}>
                            Sign up
                        </button>
                    </div>
                </section>

                <section className="landing-modules">
                    {MODULES.map((m) => (
                        <article key={m.title} className={"landing-card" + (m.soon ? " soon" : "")}>
                            <h2>
                                {m.title}
                                {m.soon && <small>Final release</small>}
                            </h2>
                            <p>{m.text}</p>
                        </article>
                    ))}
                </section>
            </main>

            <footer className="landing-footer">
                © 2026 Smart-X IoT Mesh Ecosystem · PROG7312
            </footer>
        </div>
    );
}

export default LandingPage;
