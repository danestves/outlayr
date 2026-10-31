import type { ReactNode } from "react";

import { CONTAINER } from "@/lib/layout";
import { scanMotion } from "@/lib/motion";

export const COLUMNS = "grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16";
export const ASIDE = "lg:sticky lg:top-24 lg:self-start";

export function Page({
    children,
    lead,
    meta,
    title,
}: {
    children?: ReactNode;
    lead?: ReactNode;
    meta?: ReactNode;
    title: ReactNode;
}) {
    return (
        <main className={`${CONTAINER} pt-24 pb-24`} id="main" ref={scanMotion}>
            <header className="mt-16">
                {meta ? (
                    <p className="text-muted mb-6 font-mono text-xs" data-reveal>
                        {meta}
                    </p>
                ) : null}
                <h1
                    className="max-w-[680px] pb-2 text-4xl font-semibold tracking-tighter delay-100 md:text-6xl"
                    data-reveal
                >
                    {title}
                </h1>
                {lead ? (
                    <p className="text-muted mt-6 max-w-[680px] text-lg delay-200 md:text-xl" data-reveal>
                        {lead}
                    </p>
                ) : null}
            </header>
            {children}
        </main>
    );
}
