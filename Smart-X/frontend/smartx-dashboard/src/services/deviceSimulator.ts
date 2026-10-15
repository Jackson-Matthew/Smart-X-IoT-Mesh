// DEVICE SIMULATOR.
// Behaves like a fleet of ESP32 nodes: every tick it POSTs a reading for each
// device to the real telemetry endpoints, so the data enters the API exactly
// as hardware would send it (queue -> alert rules -> timeline).
//
// The greenhouse is modelled so commands have a real effect:
//   - "Simulate dry soil" makes MOIST-001 start losing moisture.
//   - While PUMP-001 is ON the moisture climbs, so the alert clears.
//   - If the pump is switched OFF again (e.g. by Undo) it falls again and
//     the alert is raised again.

import {
    sendActuatorTelemetry,
    sendEnvironmentalTelemetry,
    sendPowerTelemetry,
    type Sensor,
} from "./api";

// TEMP-002 is the seeded "faulty" device. It stays silent on purpose so the
// dashboard has an offline device to flag.
const SILENT_DEVICES = new Set(["TEMP-002"]);

export const SPIKE_DEVICE = "POWER-001";
export const SENSOR_DEVICE = "MOIST-001";
export const PUMP_DEVICE = "PUMP-001";

// Last value per device so readings drift smoothly instead of jumping.
const state = new Map<string, number>();

function drift(id: string, start: number, step: number, min: number, max: number) {
    const previous = state.get(id) ?? start;
    const next = Math.min(max, Math.max(min, previous + (Math.random() - 0.5) * step));
    state.set(id, next);
    return next;
}

const packet = <T,>(deviceIdentifier: string, telemetryType: string, data: T) => ({
    packetId: crypto.randomUUID(),
    deviceIdentifier,
    timestamp: new Date().toISOString(),
    telemetryType,
    data,
});

// ---------------------------------------------------------------
// Greenhouse model
// ---------------------------------------------------------------
const NORMAL_MOISTURE = 55;
const DRY_LIMIT = 20;          // below this the API raises "LowMoisture"
const RECOVERED_AT = 60;       // dry mode ends once the soil is this wet

let moisture = NORMAL_MOISTURE;
let drought = false;

// Commanded state of every actuator ("On"/"Off"), kept up to date by the page.
let actuatorStates: Record<string, string> = {};

export function setActuatorStates(states: Record<string, string>) {
    actuatorStates = states;
}

function isOn(deviceIdentifier: string): boolean {
    const key = Object.keys(actuatorStates).find(
        (k) => k.toLowerCase() === deviceIdentifier.toLowerCase()
    );

    return key !== undefined && actuatorStates[key].toLowerCase() === "on";
}

// The soil dries out. Called by the "Simulate dry soil" button.
export function startDrought() {
    drought = true;
    moisture = DRY_LIMIT - 8;
}

function nextMoisture(): number {
    if (drought) {
        // Pump on: +6 per tick. Pump off: the soil keeps drying (-3 per tick).
        moisture = Math.min(80, Math.max(5, moisture + (isOn(PUMP_DEVICE) ? 6 : -3)));

        if (moisture >= RECOVERED_AT) {
            drought = false;
        }
    } else {
        moisture = Math.min(70, Math.max(40, moisture + (Math.random() - 0.5) * 4));
    }

    return moisture;
}

// ---------------------------------------------------------------
// Power spike (several identical bad packets prove the HashSet only
// raises ONE alert)
// ---------------------------------------------------------------
let spikeTicksLeft = 0;

export function injectPowerSpike(ticks = 3) {
    spikeTicksLeft = ticks;
}

function spikeActive(): boolean {
    if (spikeTicksLeft <= 0) return false;
    spikeTicksLeft -= 1;
    return true;
}

// ---------------------------------------------------------------
// Sending
// ---------------------------------------------------------------
export async function sendOneReading(sensor: Sensor): Promise<void> {
    const id = sensor.deviceIdentifier;

    if (SILENT_DEVICES.has(id)) {
        return;
    }

    if (sensor.category === "Environmental") {
        const wet = id === SENSOR_DEVICE
            ? nextMoisture()
            : drift(`${id}:h`, 55, 4, 35, 75);

        await sendEnvironmentalTelemetry(
            packet(id, "Environmental", {
                temperature: Number(drift(`${id}:t`, 24, 1, 18, 32).toFixed(1)),
                humidity: Number(wet.toFixed(1)),
                pressure: 1012,
            }) as never
        );
    } else if (sensor.category === "PowerConsumption") {
        const watts = id === SPIKE_DEVICE && spikeActive()
            ? 3800
            : drift(`${id}:p`, 1100, 150, 700, 1600);

        await sendPowerTelemetry(
            packet(id, "PowerConsumption", {
                voltage: Number(drift(`${id}:v`, 230, 2, 222, 238).toFixed(1)),
                current: Number((watts / 230).toFixed(2)),
                power: Number(watts.toFixed(1)),
                energyConsumed: Number(drift(`${id}:e`, 15, 0.2, 0, 1000).toFixed(2)),
            }) as never
        );
    } else {
        // Actuators report what they were last commanded to do.
        const commanded = Object.keys(actuatorStates).some(
            (k) => k.toLowerCase() === id.toLowerCase()
        );
        const running = commanded ? isOn(id) : true;

        await sendActuatorTelemetry(
            packet(id, "Actuator", {
                state: running ? "Running" : "Stopped",
                value: running ? Number(drift(`${id}:a`, 70, 6, 40, 95).toFixed(0)) : 0,
            }) as never
        );
    }
}

export async function sendReadingsForAll(sensors: Sensor[]): Promise<void> {
    // allSettled: one failing device must not stop the others.
    await Promise.allSettled(sensors.map(sendOneReading));
}
