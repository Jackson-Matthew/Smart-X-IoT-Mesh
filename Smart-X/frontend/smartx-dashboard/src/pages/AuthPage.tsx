import { useState, type FormEvent } from "react";

import {
    firebaseConfigured,
    friendlyAuthError,
    signIn,
    signUp,
} from "../services/firebase";
import { Logo } from "../components/Logo";

type Mode = "signin" | "signup";

// Sign in / create account. On success Firebase tells App.tsx (watchAuth),
// which then swaps this screen for the dashboard automatically.
function AuthPage({ onBack }: { onBack: () => void }) {
    const [mode, setMode] = useState<Mode>("signin");
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

    return (
        <div className="auth-screen">
            <div className="auth-card">
                <button type="button" className="auth-back" onClick={onBack}>
                    ← Back
                </button>

                <Logo />

                <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
                <p className="auth-sub">
                    {mode === "signin"
                        ? "Sign in to the Smart-X operations console."
                        : "Register to access the Smart-X operations console."}
                </p>

                {!firebaseConfigured && (
                    <div className="auth-warning">
                        Authentication is not configured. Add the Firebase
                        settings (VITE_FIREBASE_*) to the .env file and
                        rebuild.
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <label>
                        Email
                        <input
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                        />
                    </label>

                    <label>
                        Password
                        <input
                            type="password"
                            autoComplete={mode === "signin" ? "current-password" : "new-password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
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
                            />
                        </label>
                    )}

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-submit" disabled={busy}>
                        {busy
                            ? "Please wait..."
                            : mode === "signin"
                              ? "Sign in"
                              : "Create account"}
                    </button>
                </form>

                <p className="auth-switch">
                    {mode === "signin" ? "New to Smart-X?" : "Already registered?"}{" "}
                    <button
                        type="button"
                        onClick={() => {
                            setMode(mode === "signin" ? "signup" : "signin");
                            setError(null);
                        }}
                    >
                        {mode === "signin" ? "Create an account" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}

export default AuthPage;
