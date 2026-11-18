import type { Locale } from "@outlayr/shared/i18n";
import { useState } from "react";
import type { ReactNode } from "react";
import { useLocale } from "react-intlayer";

import "@/components/app-ui/app-theme.css";

type Replicas = typeof import("./replicas");

const SERVER_HTML = { __html: "" };

let replicas: Replicas | undefined;
let kept = 0;

async function load() {
    replicas ??= await import("./replicas");
}

export async function loadReplicas() {
    if (kept === 0) {
        await load();
    }
}

export function Replica({ children }: { children: (replicas: Replicas, locale: Locale) => ReactNode }) {
    const { locale } = useLocale();
    const [, setLive] = useState(false);
    if (replicas) {
        return (
            <div className="contents" key="live">
                {children(replicas, locale)}
            </div>
        );
    }
    const hold = (island: HTMLDivElement | null) => {
        const held = island?.firstChild ? 1 : 0;
        kept += held;
        if (held === 0) {
            void load().then(() => setLive(true));
        }
        return () => {
            kept -= held;
        };
    };
    return (
        <div
            className="contents"
            dangerouslySetInnerHTML={SERVER_HTML}
            key={locale}
            ref={hold}
            suppressHydrationWarning
        />
    );
}
