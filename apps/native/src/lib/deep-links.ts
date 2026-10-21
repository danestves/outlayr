/**
 * Widgets, App Intents and quick actions hard-code these outside the JS bundle, so they can't be `Href`-checked.
 * The `outlayr://` names are a stable public vocabulary: moving a screen must not break an installed widget.
 */

export const DEEP_LINKS = {
    budgets: "outlayr://budgets",
    insights: "outlayr://insights",
    log: "outlayr://log",
    newExpense: "outlayr://new",
    newIncome: "outlayr://new?income=1",
    overallBudget: "outlayr://budgets/overall",
    search: "outlayr://search",
} as const;

export function transactionLink(id: string): string {
    return `outlayr://transaction/${id}`;
}

export function budgetLink(id: string): string {
    return `${DEEP_LINKS.budgets}/${id}`;
}

/** Hosts the Swift app shipped: a shortcut built against the old build still fires them. */
// Keyed by an untrusted host parsed off the URL, hence a Map.
const LEGACY_HOSTS = new Map<string, string>([
    ["budget", "/budgets"],
    ["newexpense", "/transactions/create"],
    ["newincome", "/transactions/create?income=1"],
    ["transactions", "/"],
]);

const HOSTS = new Map<string, string>([
    ["budgets", "/budgets"],
    ["insights", "/insights"],
    ["log", "/"],
    ["new", "/transactions/create"],
    ["search", "/search"],
    ["transaction", "/transactions"],
]);

const ID_HOSTS = new Set(["budgets", "transaction"]);

/** `/transactions/[id]` has no index, so a bare `outlayr://transaction` would otherwise reach `+not-found`. */
const ID_HOST_SECTION = new Map<string, string>([["transaction", "/"]]);

const SCHEME_PREFIX = /^[a-zA-Z][\w+.-]*:\/\//;

/** expo-router hands `redirectSystemPath` the raw URL on a cold start but a normalized path once running. */
interface UrlParts {
    query: string;
    segments: string[];
}

function parts(raw: string): UrlParts {
    const withoutScheme = raw.replace(SCHEME_PREFIX, "");
    const [pathname = "", query = ""] = withoutScheme.split("?");
    return {
        query: query ? `?${query}` : "",
        segments: pathname.split("/").filter(Boolean),
    };
}

/** Null leaves the link to expo-router, which keeps in-app `<Link>`s and dev-client URLs working. */
export function resolveDeepLink(raw: string): string | null {
    const { segments, query } = parts(raw);
    const [host, ...rest] = segments;
    if (!host) {
        return null;
    }

    const key = host.toLowerCase();
    const legacy = LEGACY_HOSTS.get(key);
    if (legacy) {
        return legacy;
    }

    const base = HOSTS.get(key);
    if (!base) {
        return null;
    }

    if (ID_HOSTS.has(key) && rest.length > 0) {
        return `${base}/${rest.join("/")}${query}`;
    }

    return `${ID_HOST_SECTION.get(key) ?? base}${query}`;
}

/**
 * expo-router never empties expo-linking's launch-URL registry (`expo-router/build/global-state/useStore.js:47`),
 * so without the drain a dev reload lands back on the launch destination.
 */
export function redirectLaunchPath(
    { path, initial }: { path: string | null; initial: boolean },
    drainLaunchURL: () => void
): string | null {
    if (!path) {
        return path;
    }
    if (initial) {
        drainLaunchURL();
    }
    return resolveDeepLink(path) ?? path;
}
