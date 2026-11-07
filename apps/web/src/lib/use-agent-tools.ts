import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import type { Locale } from "./i18n";

export function useAgentTools(locale: Locale) {
    const router = useRouter();
    // oxlint-disable-next-line outlayr/react-effect-budget -- registers WebMCP tools on document.modelContext and aborts them on unmount
    useEffect(() => {
        const modelContext = document.modelContext ?? navigator.modelContext;
        if (!modelContext) {
            return;
        }
        const controller = new AbortController();
        void import("./agent-tools").then(({ registerAgentTools }) => {
            if (!controller.signal.aborted) {
                registerAgentTools(modelContext, router, locale, controller.signal);
            }
        });
        return () => controller.abort();
    }, [locale, router]);
}
