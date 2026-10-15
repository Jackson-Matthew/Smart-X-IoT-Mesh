// Small line-icon set (24x24, stroke based) used by the sidebar and the
// statistic cards. Inline SVG: no image files or icon library needed.
const PATHS: Record<string, string> = {
    devices: "M4 6h16v10H4zM8 20h8M12 16v4",
    bolt: "M13 3L5 14h6l-1 7 8-11h-6z",
    mesh: "M6 6a2 2 0 100-.01M18 6a2 2 0 100-.01M12 18a2 2 0 100-.01M7.6 7.4l3.5 9M16.4 7.4l-3.5 9M8 6h8",
    queue: "M4 6h16M4 12h10M4 18h6",
    alert: "M12 4l9 16H3zM12 10v4M12 17v.01",
    offline: "M3 3l18 18M8.5 8.5A6 6 0 0118 12M5 12a10 10 0 014-3.5M9 16a4 4 0 016 0M12 20v.01",
    undo: "M9 7L4 12l5 5M4 12h10a6 6 0 010 12",
    shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
    stack: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
    user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
    logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
    pulse: "M3 12h4l3-8 4 16 3-8h4",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[name]} />
        </svg>
    );
}
