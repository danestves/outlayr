import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { PostHog, Properties } from "posthog-js";

export type Consent = "denied" | "granted" | "pending";

export class AnalyticsLoadError extends Schema.TaggedError<AnalyticsLoadError>()("AnalyticsLoadError", {
    cause: Schema.Defect(),
    client: Schema.Literal("posthog-js"),
}) {
    override get message(): string {
        return `The ${this.client} analytics client failed to load.`;
    }
}

const TOKEN = import.meta.env.PROD ? import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN : undefined;

const ASK_FIRST = new Set([
    "AT",
    "AX",
    "BE",
    "BG",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GF",
    "GP",
    "GR",
    "HR",
    "HU",
    "IE",
    "IS",
    "IT",
    "LI",
    "LT",
    "LU",
    "LV",
    "MF",
    "MQ",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RE",
    "RO",
    "SE",
    "SI",
    "SK",
    "T1",
    "XX",
    "YT",
]);

// Loaded on start rather than imported: posthog-js was over a third of the chunk every page waits on.
let posthog: PostHog | null = null;
let starting = false;
const listeners = new Set<() => void>();

function notify() {
    for (const listener of listeners) {
        listener();
    }
}

const INTERACTIONS = ["keydown", "pointerdown", "scroll"] as const;

function recordOnFirstInteraction(client: PostHog) {
    const controller = new AbortController();
    const start = () => {
        controller.abort();
        client.startSessionRecording();
    };
    for (const type of INTERACTIONS) {
        window.addEventListener(type, start, { capture: true, passive: true, signal: controller.signal });
    }
}

export const startAnalytics = Effect.fn("Analytics.start")(function* startAnalytics(country: string | null) {
    if (!TOKEN || starting) {
        return;
    }
    starting = true;
    const { posthog: client } = yield* Effect.tryPromise({
        catch: (cause) => new AnalyticsLoadError({ cause, client: "posthog-js" }),
        try: () => import("posthog-js"),
    });
    client.init(TOKEN, {
        advanced_disable_feature_flags: true,
        api_host: "https://relay.tryoutlayr.com",
        capture_exceptions: true,
        cookieless_mode: "on_reject",
        defaults: "2026-08-30",
        disable_conversations: true,
        disable_product_tours: true,
        disable_session_recording: true,
        disable_surveys: true,
        ui_host: "https://us.posthog.com",
    });
    recordOnFirstInteraction(client);
    const sendsGpc = "globalPrivacyControl" in navigator && navigator.globalPrivacyControl === true;
    const asksFirst = country === null || ASK_FIRST.has(country) || sendsGpc;
    if (!asksFirst && client.get_explicit_consent_status() === "pending") {
        client.opt_in_capturing({ captureEventName: false });
    }
    posthog = client;
    notify();
});

/** Dropped until analytics has started, as posthog itself drops events before `init`. */
export function capture(event: string, properties?: Properties) {
    posthog?.capture(event, properties);
}

export function readConsent(): Consent | null {
    return posthog?.get_explicit_consent_status() ?? null;
}

export function subscribeConsent(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function chooseConsent(granted: boolean) {
    if (granted) {
        posthog?.opt_in_capturing();
    } else {
        posthog?.opt_out_capturing();
    }
    notify();
}
