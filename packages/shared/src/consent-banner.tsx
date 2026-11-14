import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { chooseConsent, readConsent, subscribeConsent } from "./analytics";

export interface ConsentBannerLabels {
    allow: ReactNode;
    body: ReactNode;
    decline: ReactNode;
    label: string;
}

export function ConsentBanner({ labels, privacyLink }: { labels: ConsentBannerLabels; privacyLink: ReactNode }) {
    const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);
    if (consent !== "pending") {
        return null;
    }
    return (
        <section
            aria-label={labels.label}
            className="glass fixed bottom-4 left-4 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-3xl p-6 print:hidden"
        >
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-sm font-semibold">{labels.label}</h2>
                {privacyLink}
            </div>
            <p className="text-muted mt-2 text-sm">{labels.body}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                    className="fluid border-border hover:bg-foreground/5 rounded-full border px-3 py-2 text-sm font-semibold active:scale-[0.98]"
                    onClick={() => chooseConsent(false)}
                    type="button"
                >
                    {labels.decline}
                </button>
                <button
                    className="fluid bg-foreground text-background rounded-full px-3 py-2 text-sm font-semibold hover:opacity-90 active:scale-[0.98]"
                    onClick={() => chooseConsent(true)}
                    type="button"
                >
                    {labels.allow}
                </button>
            </div>
        </section>
    );
}
