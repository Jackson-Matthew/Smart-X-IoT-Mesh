// Smart-X logo: a small mesh of connected nodes with the product name.
// Drawn as inline SVG so it needs no image file and stays sharp at any size.
export function Logo({ light = false }: { light?: boolean }) {
    const text = light ? "#ffffff" : "#0f172a";

    return (
        <div className="logo" aria-label="Smart-X">
            <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true">
                <defs>
                    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#4fd1c5" />
                        <stop offset="1" stopColor="#319795" />
                    </linearGradient>
                </defs>
                <rect width="40" height="40" rx="10" fill="url(#lg)" />
                <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
                    <line x1="10" y1="12" x2="20" y2="20" />
                    <line x1="30" y1="12" x2="20" y2="20" />
                    <line x1="20" y1="20" x2="12" y2="30" />
                    <line x1="20" y1="20" x2="29" y2="29" />
                </g>
                <g fill="#fff">
                    <circle cx="10" cy="12" r="3" />
                    <circle cx="30" cy="12" r="3" />
                    <circle cx="20" cy="20" r="4" />
                    <circle cx="12" cy="30" r="3" />
                    <circle cx="29" cy="29" r="3" />
                </g>
            </svg>
            <span style={{ color: text }}>
                Smart<b style={{ color: light ? "#e6fffa" : undefined }}>-X</b>
            </span>
        </div>
    );
}
