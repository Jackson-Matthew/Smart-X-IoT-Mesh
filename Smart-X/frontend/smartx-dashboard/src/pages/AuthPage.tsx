import { useState, type FormEvent } from "react";

import { Logo } from "../components/Logo";
import { WaveBackdrop } from "../components/WaveBackdrop";
import {
    firebaseConfigured,
    friendlyAuthError,
    signIn,
    signUp,
} from "../services/firebase";
import "../auth.css";

type Mode = "signin" | "signup";

// Sign in / create account, styled after the Purity UI auth pages:
//   sign in  -> form on the left, teal brand panel on the right
//   register -> teal banner with a floating card
// On success Firebase tells App.tsx (watchAuth), which swaps this screen
// for the dashboard automatically.
function AuthPage({
    initialMode,
    onBack,
}: {
    initialMode: Mode;
    onBack: () => void;
}) {
    const [mode, setMode] = useState<Mode>(initialMode);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        // Client-side checks first, so obvious mistakes never leave the browser.
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setError("Please enter a valid email address.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (mode === "signup" && password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        setBusy(true);

        try {
            if (mode === "signin") {
                await signIn(email.trim(), password);
            } else {
                await signUp(email.trim(), password);
            }
        } catch (err) {
            setError(friendlyAuthError(err));
        } finally {
            setBusy(false);
        }
    }

    function switchMode() {
        setMode(mode === "signin" ? "signup" : "signin");
        setError(null);
        setPassword("");
        setConfirm("");
    }

    const form = (
        <form onSubmit={handleSubmit} noValidate>
            <label>
                Email
                <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                />
            </label>

            <label>
                Password
                <input
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                />
            </label>

            {mode === "signup" && (
                <label>
                    Confirm password
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repeat your password"
                    />
                </label>
            )}

            {!firebaseConfigured && (
                <div className="pa-warning">
                    Authentication is not configured. Add the Firebase
                    settings (VITE_FIREBASE_*) to Smart-X/.env and rebuild.
                </div>
            )}

            {error && <div className="pa-error">{error}</div>}

            <button type="submit" className="pa-submit" disabled={busy}>
                {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
            </button>

            <p className="pa-switch">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button type="button" onClick={switchMode}>
                    {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
            </p>
        </form>
    );

    const topBar = (
        <header className="pa-nav">
            <Logo />
            <button type="button" onClick={onBack}>
                ← Back to home
            </button>
        </header>
    );

    const footer = (
        <footer className="pa-footer">
            <span>© 2026 Smart-X IoT Mesh Ecosystem · PROG7312</span>
        </footer>
    );

    if (mode === "signin") {
        return (
            <div className="pa-screen">
                {topBar}

                <main className="pa-split">
                    <section className="pa-split-form">
                        <h1 className="pa-title">Welcome Back</h1>
                        <p className="pa-sub">Enter your email and password to sign in</p>
                        {form}
                    </section>

                    <aside className="pa-split-brand">
                        <WaveBackdrop />
                        <div className="pa-brand-mark">
                            <Logo light />
                            <p>Real-time IoT operations</p>
                        </div>
                    </aside>
                </main>

                {footer}
            </div>
        );
    }

    return (
        <div className="pa-screen">
            <section className="pa-banner">
                <WaveBackdrop />
                <div className="pa-banner-nav">
                    <Logo light />
                    <button type="button" onClick={onBack}>
                        ← Back to home
                    </button>
                </div>

                <div className="pa-banner-text">
                    <h1>Welcome!</h1>
                    <p>
                        Create an account to open the Smart-X operations
                        console and start monitoring your devices.
                    </p>
                </div>
            </section>

            <main className="pa-card">
                <h2>Register with email</h2>
                {form}
            </main>

            {footer}
        </div>
    );
}

export default AuthPage;
