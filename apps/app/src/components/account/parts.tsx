import type { ReactNode } from "react";

import { LogoMark } from "../logo-mark";

const PILL =
    "flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-medium disabled:opacity-50";

export const SOLID_PILL = `${PILL} bg-app-ink text-app-bg`;

export function Screen({ children, title }: { children?: ReactNode; title?: ReactNode }) {
    return (
        <main className="bg-app-bg text-app-ink flex min-h-dvh flex-col items-center px-7 pt-[clamp(3rem,14dvh,7rem)] pb-10">
            <div className="flex w-full max-w-[22rem] flex-col text-center">
                <LogoMark className="mb-5 size-7 self-center" />
                {title ? <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1> : null}
                {children}
            </div>
        </main>
    );
}

export function Muted({ children }: { children: ReactNode }) {
    return <p className="text-app-muted -mt-3 mb-5 text-sm">{children}</p>;
}
