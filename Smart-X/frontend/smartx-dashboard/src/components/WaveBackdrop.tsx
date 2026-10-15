// Soft flowing white lines over the teal panels (the Purity UI auth look).
// Generated from sine waves so no image file is needed.
const LINES = 34;

function wavePath(index: number): string {
    const phase = index * 0.16;
    const lift = index * 5.5;
    const points: string[] = [];

    for (let x = 0; x <= 1000; x += 25) {
        const y =
            260 +
            Math.sin(x / 150 + phase) * (70 + index * 1.8) +
            Math.sin(x / 70 + phase * 2) * 12 -
            lift;

        points.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`);
    }

    return points.join(" ");
}

export function WaveBackdrop() {
    return (
        <svg
            className="pa-waves"
            viewBox="0 0 1000 500"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
        >
            {Array.from({ length: LINES }, (_, i) => (
                <path
                    key={i}
                    d={wavePath(i)}
                    fill="none"
                    stroke="#fff"
                    strokeOpacity={0.1 + (i % 6) * 0.04}
                    strokeWidth="1"
                />
            ))}
        </svg>
    );
}
