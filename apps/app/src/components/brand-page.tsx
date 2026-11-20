import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

import { Brand } from "./logo-mark";

export function BrandPage({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
    return (
        <div className="app-shell bg-background text-foreground flex min-h-dvh flex-col">
            <header className="border-border h-app-bar flex shrink-0 items-center gap-3 border-b px-6 max-sm:px-4">
                <Brand className="mr-auto" />
                {actions}
            </header>
            {children}
        </div>
    );
}

export function SessionEmail() {
    const { data: session } = authClient.useSession();
    return <span className="text-muted-foreground ph-no-capture text-app-label truncate">{session?.user.email}</span>;
}

export function Centered({ children }: { children: ReactNode }) {
    return (
        <main className="flex flex-1 items-center justify-center px-6 pt-8 pb-24 max-sm:px-4">
            <div className="w-full max-w-130">{children}</div>
        </main>
    );
}

export function ArtCard({ action, body, title }: { action: ReactNode; body: ReactNode; title: ReactNode }) {
    return (
        <section className="bg-card border-border rounded-app-xl overflow-hidden border pb-5 text-center shadow-xs">
            <img
                alt=""
                className="h-28 w-full object-cover object-[50%_45%] dark:hidden"
                height={352}
                src="/paywall-terrain-light.svg"
                width={438}
            />
            <img
                alt=""
                className="hidden h-28 w-full object-cover object-[50%_45%] dark:block"
                height={352}
                src="/paywall-terrain.svg"
                width={438}
            />
            <h1 className="text-app-title mt-3 font-semibold">{title}</h1>
            <p className="text-muted-foreground text-app-label mt-1 px-5">{body}</p>
            <div className="mt-4 flex justify-center">{action}</div>
        </section>
    );
}
