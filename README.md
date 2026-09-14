# Smart-X — IoT Mesh Ecosystem (Part 1)

Smart-X is a simulated IoT ingestion gateway for a distributed sensor network (soil moisture, power meters, smart valves, etc). Part 1 covers sensor registration, telemetry ingestion, and file/log attachments.

## Architecture

- **Backend:** ASP.NET Core Web API (.NET 10) — `Smart-X/backend/Smart-X.Api`
- **Frontend:** React + TypeScript + Vite — `Smart-X/frontend/smartx-dashboard`

The frontend talks to the backend over HTTPS using the base URL set in `VITE_API_BASE_URL`.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 20+ and npm
- (Optional) Docker Desktop, if you want to run the API in a container

## 1. Clone and restore

```bash
git clone <your-repo-url>
cd Smart-X
```

## 2. Run the backend API

```bash
cd backend/Smart-X.Api
dotnet restore
dotnet run
```

By default the API listens on:
- `https://localhost:7042`
- `http://localhost:5217`

Swagger UI is available at `https://localhost:7042/swagger` while running in the `Development` environment, and is useful for testing endpoints (sensor registration, telemetry, media upload, issues) without the frontend.

On first launch, the API seeds some mock sensors and telemetry so the dashboard isn't empty.

## 3. Run the frontend dashboard

Open a **second terminal** (leave the API running):

```bash
cd frontend/smartx-dashboard
npm install
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`) — open that in your browser.

The frontend reads the API's address from an environment variable. Check `frontend/smartx-dashboard/.env`:

```
VITE_API_BASE_URL=https://localhost:7042
```

Update this if your API is running on a different port.

## 4. Running with Docker (backend only, optional)

```bash
cd backend/Smart-X.Api
docker build -t smartx-api .
docker run -p 8080:8080 -p 8081:8081 smartx-api
```

If you use the container, update `VITE_API_BASE_URL` in the frontend `.env` to point at the container's port instead of `7042`.

## Using the app

The dashboard opens on the **Sensor Data Ingestion & Telemetry** tab. The other two tabs (**Real-Time Command Stream & History** and **Network Topology & Mesh Routing**) are placeholders for Part 2 and the final PoE.

From the ingestion tab you can:
- Register a sensor (MAC address, deployment location, category)
- Simulate telemetry readings (environmental / power / actuator)
- View live telemetry and historical charts
- Attach a log file or photo to a sensor
- Report and resolve device issues (the dashboard's dynamic engagement feature — surfaces offline sensors and unresolved issues as live alerts rather than a static progress bar)

## Key technical features (Part 1 requirements)

| Requirement | Implementation |
|---|---|
| Generics | `TelemetryPacket<T>` wraps any sensor payload type (`EnvironmentalTelemetry`, `PowerConsumptionTelemetry`, `ActuatorTelemetry`) without boxing |
| Operator overloading | `SensorReading` overloads `+` to aggregate two readings |
| Jagged arrays | `TelemetryHistory` stores historical batches as `double[][]` |
| Recursion | `DeploymentValidator` recursively validates nested deployment trees (Zone → Sub-Zone → Node) |
| File/log upload | `SensorMediaController` — extension whitelist, 10MB size cap, multipart upload |

## Project structure

```
Smart-X/
├── backend/Smart-X.Api/
│   ├── Controllers/       # API endpoints (sensors, telemetry, media, issues, deployment)
│   ├── Models/            # Domain models + telemetry payload types
│   ├── Services/          # Business logic, validation, seeding
│   └── DTOs/               # Request/response contracts
└── frontend/smartx-dashboard/
    └── src/
        ├── App.tsx        # Dashboard UI + tab navigation
        └── services/api.ts # API client
```

## Known limitations

- Real-Time Command Stream (Part 2) and Network Topology (final PoE) are not yet implemented — the tabs are visible but disabled.
- No persistent database yet — data is stored in memory and resets when the API restarts.

## Roadmap

- **Part 2:** Queues, priority queues, stacks (command history/undo), dictionaries for device lookup, sets for unique alert tracking, and a predictive action engine.
- **Final PoE:** Trees for historical queries, graphs + BFS/DFS + MST for mesh routing visualisation.
