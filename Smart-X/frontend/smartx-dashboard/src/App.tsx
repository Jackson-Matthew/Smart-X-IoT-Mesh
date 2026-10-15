import { useEffect, useState } from "react";

import Dashboard from "./Dashboard";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import { logOut, watchAuth, type User } from "./services/firebase";
import "./landing.css";

// ROOT: decides what the visitor sees.
//   not signed in -> landing page  ->  sign in / register
//   signed in     -> the Smart-X dashboard
// Nothing in the dashboard (or its API polling) is mounted until Firebase
// confirms the user, so the system cannot be used unauthenticated.
function App() {
    const [user, setUser] = useState<User | null>(null);
    const [checking, setChecking] = useState(true);
    const [screen, setScreen] = useState<"landing" | "auth">("landing");

    useEffect(() => {
        // Fires on page load too, so a refresh keeps the user signed in.
        return watchAuth((u) => {
            setUser(u);
            setChecking(false);
        });
    }, []);

    if (checking) {
        return (
            <div className="boot-screen">
                <div className="spinner" />
                <p>Connecting to Smart-X...</p>
            </div>
        );
    }

    if (user) {
        return (
            <Dashboard
                email={user.email ?? "operator"}
                onSignOut={() => {
                    setScreen("landing");
                    logOut();
                }}
            />
        );
    }

    return screen === "landing" ? (
        <LandingPage onSignIn={() => setScreen("auth")} />
    ) : (
        <AuthPage onBack={() => setScreen("landing")} />
    );
}

export default App;
