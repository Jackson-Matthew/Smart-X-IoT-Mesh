# Smart-X — IoT Mesh Ecosystem (Part 1)

Smart-X is a simulated IoT ingestion gateway for a distributed sensor network (soil moisture, power meters, smart valves, etc). Part 1 covers sensor registration, telemetry ingestion, and file/log attachments.
## Video Link
https://youtu.be/AW7prJNJZyg

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

## 4. Running with Docker (full stack)

As an alternative to steps 2 and 3, Docker Compose builds and runs **both** the API and the dashboard with one command. No local .NET SDK or Node.js install is needed, only [Docker Desktop](https://www.docker.com/products/docker-desktop/).

From the `Smart-X` folder:

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API health check | http://localhost:8080/api/health |
| Swagger UI | http://localhost:8080/swagger |

To stop the containers (add `-v` to also delete uploaded files):

```bash
docker compose down
```

### How the containers fit together

```
Browser ──> dashboard container (nginx, port 3000)
              ├── /        → built React app (static files)
              └── /api/... → forwarded to api container (ASP.NET Core, port 8080)
```

| File | Purpose |
|---|---|
| `docker-compose.yml` | Defines the `api` and `dashboard` services, their ports, and the `sensor-uploads` volume |
| `backend/Smart-X.Api/Dockerfile` | Multi-stage build: .NET 10 SDK compiles and publishes, then the smaller ASP.NET runtime image runs it as a non-root user |
| `frontend/smartx-dashboard/Dockerfile` | Multi-stage build: Node 22 runs `npm run build`, then nginx serves the static `dist` output |
| `frontend/smartx-dashboard/nginx.conf` | Serves the app, forwards `/api` to the API container, and allows uploads up to 10 MB |

Notes:
- nginx forwards API calls, so the browser only ever talks to `localhost:3000`. That means no CORS or HTTPS certificate setup is needed, and the image is built with an empty `VITE_API_BASE_URL`.
- The API runs in `Development` mode inside the container, so Swagger is available.
- Uploaded sensor files are kept in the `sensor-uploads` Docker volume. Sensors and telemetry are still in-memory and are re-seeded each time the API container starts.
- To build only the API image: `docker build -f backend/Smart-X.Api/Dockerfile -t smartx-api .` (run from `Smart-X`).

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
