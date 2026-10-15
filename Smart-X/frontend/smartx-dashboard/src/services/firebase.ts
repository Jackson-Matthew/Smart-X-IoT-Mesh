// AUTHENTICATION (Firebase Authentication, email + password).
// Sign-in is checked by Google's Firebase servers, not by this app, so there
// are no usernames or passwords stored in the code.
//
// The values below come from the .env file (VITE_FIREBASE_*). A Firebase web
// config is a public identifier, not a secret: access is protected by the
// sign-in rules in the Firebase project, not by hiding these values.

import { initializeApp } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    type User,
} from "firebase/auth";

const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// False until the .env values are filled in (the login page explains this).
export const firebaseConfigured = Boolean(
    config.apiKey && config.authDomain && config.projectId && config.appId
);

const auth = firebaseConfigured ? getAuth(initializeApp(config)) : null;

export type { User };

// Calls back every time the user signs in or out (and once on page load,
// so a refreshed page stays signed in).
export function watchAuth(callback: (user: User | null) => void) {
    if (!auth) {
        callback(null);
        return () => undefined;
    }

    return onAuthStateChanged(auth, callback);
}

export async function signIn(email: string, password: string) {
    if (!auth) throw new Error("not-configured");
    await signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string) {
    if (!auth) throw new Error("not-configured");
    await createUserWithEmailAndPassword(auth, email, password);
}

export async function logOut() {
    if (auth) await signOut(auth);
}

// Turns Firebase's error codes into messages a person can act on.
export function friendlyAuthError(err: unknown): string {
    const code =
        typeof err === "object" && err !== null && "code" in err
            ? String((err as { code: unknown }).code)
            : err instanceof Error
              ? err.message
              : "";

    switch (code) {
        case "not-configured":
            return "Authentication is not configured yet. Add the Firebase settings to the .env file.";
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-login-credentials":
            return "Incorrect email or password.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/email-already-in-use":
            return "An account with this email already exists. Try signing in.";
        case "auth/weak-password":
            return "Password is too weak. Use at least 6 characters.";
        case "auth/too-many-requests":
            return "Too many attempts. Please wait a moment and try again.";
        case "auth/network-request-failed":
            return "Network error. Check your internet connection.";
        default:
            return "Something went wrong. Please try again.";
    }
}
