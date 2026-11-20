import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

export function ErrorBand({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <p
            className={`border-app-spend/25 bg-app-spend/12 text-app-label flex items-center gap-2 text-[color-mix(in_oklab,var(--color-app-spend),var(--color-foreground)_30%)] ${className}`}
            role="alert"
        >
            <HugeiconsIcon className="shrink-0" icon={AlertCircleIcon} size={16} />
            {children}
        </p>
    );
}
