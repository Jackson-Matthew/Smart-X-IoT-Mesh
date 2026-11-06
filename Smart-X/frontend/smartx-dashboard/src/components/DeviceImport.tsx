import { useState } from "react";

import { importDevices, type DeviceImportResult } from "../services/api";

// "Import devices from file": uploads a .txt list, shows exactly what the
// API did with each line, then tells the page to reload its sensor grid so
// the rest of the dashboard updates straight away.
function DeviceImport({ onImported }: { onImported: () => Promise<void> | void }) {
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<DeviceImportResult | null>(null);

    async function handleImport() {
        if (!file) {
            setError("Choose a .txt file first.");
            return;
        }

        if (!file.name.toLowerCase().endsWith(".txt")) {
            setError("Only .txt files can be imported.");
            return;
        }

        setBusy(true);
        setError(null);
        setResult(null);

        try {
            setResult(await importDevices(file));
            await onImported();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="registration-section">
            <div className="section-heading">
                <div>
                    <h2>Import Devices from File</h2>
                    <p>
                        Upload a .txt list (one device per line:
                        {" "}<code>DeviceId, MAC, Location, Category</code>).
                        Valid devices are registered and appear in the grid.
                    </p>
                </div>
            </div>

            <div className="import-row">
                <input
                    type="file"
                    accept=".txt,text/plain"
                    onChange={(e) => {
                        setFile(e.target.files?.[0] ?? null);
                        setResult(null);
                        setError(null);
                    }}
                />

                <button type="button" onClick={handleImport} disabled={busy || !file}>
                    {busy ? "Importing..." : "Import devices"}
                </button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {result && (
                <div className="import-result">
                    <p>
                        <strong>{result.imported.length}</strong> imported ·{" "}
                        <strong>{result.skipped.length}</strong> skipped ·{" "}
                        {result.linesRead} lines read
                    </p>

                    {result.imported.length > 0 && (
                        <ul className="import-ok">
                            {result.imported.map((s) => (
                                <li key={s.id}>
                                    ✓ {s.deviceIdentifier} · {s.deploymentLocation} · {s.category}
                                </li>
                            ))}
                        </ul>
                    )}

                    {result.skipped.length > 0 && (
                        <ul className="import-bad">
                            {result.skipped.map((s) => (
                                <li key={s.lineNumber}>
                                    ✗ Line {s.lineNumber}: {s.reason}
                                    <small>{s.text}</small>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
}

export default DeviceImport;
