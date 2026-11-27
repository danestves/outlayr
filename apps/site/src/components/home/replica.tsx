import type { Locale } from "@outlayr/shared/i18n";
import { createContext, use, useState } from "react";
import type { ReactNode } from "react";
import { useLocale } from "react-intlayer";

import "@/components/app-ui/app-theme.css";
import "@/stageshow/phone.css";

import type { DemoCast } from "@/components/app-ui/cast";

export type Replicas = typeof import("./replicas");

export const CastContext = createContext<DemoCast | null>(null);

const SERVER_HTML = { __html: "" };
const RELOAD_KEY = "outlayr:replica-reload";

let replicas: Replicas | undefined;
let kept = 0;

async function load() {
    replicas ??= await import("./replicas");
}

function reloadOnce() {
    try {
        if (sessionStorage.getItem(RELOAD_KEY) === location.href) {
            return;
        }
        sessionStorage.setItem(RELOAD_KEY, location.href);
    } catch {
        return;
    }
    location.reload();
}

export async function loadReplicas() {
    if (kept === 0) {
        await load().catch(() => null);
    }
}

export function Replica({ children }: { children: (replicas: Replicas, locale: Locale) => ReactNode }) {
    const { locale } = useLocale();
    const cast = use(CastContext);
    const [, setLive] = useState(false);
    if (!cast) {
        throw new Error("Replicas render inside CastContext.");
    }
    if (replicas) {
        return (
            <div className="contents" key="live">
                <replicas.DemoCastContext value={cast}>{children(replicas, locale)}</replicas.DemoCastContext>
            </div>
        );
    }
    const hold = (island: HTMLDivElement | null) => {
        const held = island?.firstChild ? 1 : 0;
        kept += held;
        if (held === 0) {
            void load()
                .then(() => setLive(true))
                .catch(reloadOnce);
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
