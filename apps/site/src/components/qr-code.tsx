import { SITE_URL } from "@outlayr/shared/urls";

import { qrModules } from "@/lib/qr";

const DOWNLOAD_URL = `${SITE_URL}/download`;

let downloadPath: { d: string; size: number } | null = null;
const downloadPathOnce = () => (downloadPath ??= pathOf(DOWNLOAD_URL));

function pathOf(text: string) {
    const modules = qrModules(text);
    const d = modules.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ""))).join("");
    return { d, size: modules.length };
}

export function DownloadQr({ className, label }: { className?: string; label?: string }) {
    const { d, size } = downloadPathOnce();
    return (
        <svg
            aria-hidden={label === undefined ? true : undefined}
            aria-label={label}
            className={className}
            role={label === undefined ? undefined : "img"}
            viewBox={`0 0 ${size} ${size}`}
        >
            <path d={d} fill="currentColor" />
        </svg>
    );
}
