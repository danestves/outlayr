import type { ReactNode } from "react";

export function PanelHeader({ children }: { children: ReactNode }) {
    return <div className="border-border flex h-[52px] items-center gap-2.5 border-b px-4">{children}</div>;
}

export function PanelSection({ aside, children, title }: { aside?: ReactNode; children: ReactNode; title: ReactNode }) {
    return (
        <section className="border-border border-b px-4 py-3.5 last:border-b-0">
            <div className="text-muted-foreground mb-2.5 flex items-baseline justify-between gap-2 text-xs leading-4">
                <h3 className="font-normal">{title}</h3>
                {aside ? <span className="truncate">{aside}</span> : null}
            </div>
            {children}
        </section>
    );
}

export function Meter({ color, ratio, thin = false }: { color: string; ratio: number; thin?: boolean }) {
    return (
        <div aria-hidden className={`bg-muted w-full overflow-hidden rounded-full ${thin ? "h-1" : "h-1.5"}`}>
            <div
                className="h-full rounded-full"
                style={{ backgroundColor: color, width: `${Math.min(ratio, 1) * 100}%` }}
            />
        </div>
    );
}
