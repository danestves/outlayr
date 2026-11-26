import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { PostHog, PostHogConfig, Properties } from "posthog-js";

import { dropNoiseExceptions } from "./exception-noise";

export type Consent = "denied" | "granted" | "pending";

export class AnalyticsLoadError extends Schema.TaggedError<AnalyticsLoadError>()("AnalyticsLoadError", {
    cause: Schema.Defect(),
    client: Schema.Literal("posthog-js"),
}) {
    override get message(): string {
        return `The ${this.client} analytics client failed to load.`;
    }
}

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
let identity: string | null | undefined;
let starting = false;
const listeners = new Set<() => void>();
let markStarted: (() => void) | undefined;
/** Resolves once posthog-js has started. It only captures WebMCP tools registered after that. */
export const analyticsStarted = new Promise<void>((resolve) => {
    markStarted = resolve;
});

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

export const startAnalytics = Effect.fn("Analytics.start")(function* startAnalytics(
    token: string | undefined,
    country: string | null,
    scope?: Pick<PostHogConfig, "cross_subdomain_cookie" | "persistence_name">
) {
    if (!token || starting) {
        return;
    }
    starting = true;
    const { posthog: client } = yield* Effect.tryPromise({
        catch: (cause) => new AnalyticsLoadError({ cause, client: "posthog-js" }),
        try: () => import("posthog-js"),
    });
    client.init(token, {
        advanced_disable_feature_flags: true,
        api_host: "https://relay.tryoutlayr.com",
        before_send: dropNoiseExceptions,
        capture_exceptions: true,
        capture_webmcp: true,
        cookieless_mode: "on_reject",
        defaults: "2026-08-30",
        disable_conversations: true,
        disable_product_tours: true,
        disable_session_recording: true,
        disable_surveys: true,
        loaded: (loaded) => {
            if (identity === null) {
                forget(loaded);
            }
        },
        ui_host: "https://us.posthog.com",
        ...scope,
    });
    recordOnFirstInteraction(client);
    const sendsGpc = "globalPrivacyControl" in navigator && navigator.globalPrivacyControl === true;
    const asksFirst = country === null || ASK_FIRST.has(country) || sendsGpc;
    if (!asksFirst && client.get_explicit_consent_status() === "pending") {
        client.opt_in_capturing({ captureEventName: false });
    }
    posthog = client;
    applyIdentity();
    markStarted?.();
    notify();
});

/** Dropped until analytics has started, as posthog itself drops events before `init`. */
export function capture(event: string, properties?: Properties) {
    posthog?.capture(event, properties);
}

/** Dropped unless the visitor allowed the cookie, so nothing is sent cookieless. */
export function captureConsented(event: string, properties?: Properties) {
    if (posthog?.has_opted_in_capturing() === true) {
        posthog.capture(event, properties);
    }
}

type Forgettable = Pick<
    PostHog,
    "get_explicit_consent_status" | "get_property" | "opt_in_capturing" | "opt_out_capturing" | "reset"
>;

function forget(client: Forgettable) {
    if (client.get_property("$user_state") === "identified") {
        restart(client);
    }
}

function restart(client: Forgettable) {
    const consent = client.get_explicit_consent_status();
    client.reset(true);
    if (consent === "granted") {
        client.opt_in_capturing({ captureEventName: false });
    } else if (consent === "denied") {
        client.opt_out_capturing();
    }
}

function applyIdentity() {
    if (identity === null || identity === undefined || posthog?.has_opted_in_capturing() !== true) {
        return;
    }
    if (posthog.get_distinct_id() !== identity) {
        restart(posthog);
    }
    posthog.identify(identity);
}

export function identify(id: string) {
    identity = id;
    applyIdentity();
}

export function resetIdentity() {
    identity = null;
    if (posthog !== null) {
        forget(posthog);
    }
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
        applyIdentity();
    } else {
        posthog?.opt_out_capturing();
    }
    notify();
}
