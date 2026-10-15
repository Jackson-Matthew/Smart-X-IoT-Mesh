// DEVICE SIMULATOR.
// Behaves like a fleet of ESP32 nodes: every tick it POSTs a reading for each
// device to the real telemetry endpoints, so the data enters the API exactly
// as hardware would send it (queue -> alert rules -> timeline).

import {
    sendActuatorTelemetry,
    sendEnvironmentalTelemetry,
    sendPowerTelemetry,
    type Sensor,
} from "./api";

// TEMP-002 is the seeded "faulty" device. It stays silent on purpose so the
// dashboard has an offline device to flag.
const SILENT_DEVICES = new Set(["TEMP-002"]);

// Devices that can be pushed into a fault state from the UI.
export const SPIKE_DEVICE = "POWER-001";
export const DRY_DEVICE = "MOIST-001";

type Fault = { ticksLeft: number };

const faults = new Map<string, Fault>();

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

// Keeps the fault going for a few ticks (several identical bad packets in a
// row) which proves the HashSet only raises ONE alert.
export function injectFault(deviceIdentifier: string, ticks = 3) {
    faults.set(deviceIdentifier, { ticksLeft: ticks });
}

function activeFault(deviceIdentifier: string): boolean {
    const fault = faults.get(deviceIdentifier);

    if (!fault || fault.ticksLeft <= 0) {
        return false;
    }

    fault.ticksLeft -= 1;
    return true;
}

export async function sendOneReading(sensor: Sensor): Promise<void> {
    const id = sensor.deviceIdentifier;

    if (SILENT_DEVICES.has(id)) {
        return;
    }

    const faulty = activeFault(id);

    if (sensor.category === "Environmental") {
        const moisture = faulty && id === DRY_DEVICE
            ? 12
            : drift(`${id}:h`, 55, 4, 35, 75);

        await sendEnvironmentalTelemetry(
            packet(id, "Environmental", {
                temperature: Number(drift(`${id}:t`, 24, 1, 18, 32).toFixed(1)),
                humidity: Number(moisture.toFixed(1)),
                pressure: 1012,
            }) as never
        );
    } else if (sensor.category === "PowerConsumption") {
        const watts = faulty && id === SPIKE_DEVICE
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
        await sendActuatorTelemetry(
            packet(id, "Actuator", {
                state: "Running",
                value: Number(drift(`${id}:a`, 70, 6, 40, 95).toFixed(0)),
            }) as never
        );
    }
}

export async function sendReadingsForAll(sensors: Sensor[]): Promise<void> {
    // allSettled: one failing device must not stop the others.
    await Promise.allSettled(sensors.map(sendOneReading));
}
