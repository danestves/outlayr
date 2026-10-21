import type { TranslationKey } from "@/i18n/catalog";

export interface AppIconChoice {
    detail: TranslationKey;
    label: TranslationKey;
    /** `null` for the primary: iOS reports it as null, and Debug and Release ship different primaries. */
    name: string | null;
    slug: string;
}

export const APP_ICONS = [
    {
        detail: "appIcon.default.detail",
        label: "appIcon.default.label",
        name: null,
        slug: "default",
    },
    {
        detail: "appIcon.ink.detail",
        label: "appIcon.ink.label",
        name: "OutlayrInk",
        slug: "ink",
    },
    {
        detail: "appIcon.hairline.detail",
        label: "appIcon.hairline.label",
        name: "OutlayrHairline",
        slug: "hairline",
    },
    {
        detail: "appIcon.mono.detail",
        label: "appIcon.mono.label",
        name: "OutlayrMono",
        slug: "mono",
    },
    {
        detail: "appIcon.emboss.detail",
        label: "appIcon.emboss.label",
        name: "OutlayrEmboss",
        slug: "emboss",
    },
] as const satisfies readonly AppIconChoice[];

/** Literal, so `app/settings/app-icon.tsx` fails to compile when a slug lacks a preview. */
export type AppIconSlug = (typeof APP_ICONS)[number]["slug"];

export function appIconChoice(active: string | null): AppIconChoice {
    return APP_ICONS.find((icon) => icon.name === active) ?? APP_ICONS[0];
}

export function appIconLabel(active: string | null): TranslationKey {
    return appIconChoice(active).label;
}

/** Pinned against `app.config.ts` by `app-icons.test.ts`, so it cannot drift from the build's `extra`. */
export const RELEASE_PRIMARY_ICON = "Outlayr";

/**
 * A Debug build's primary is the blueprint icon and iOS reports `null` for either, so the Default row reads
 * `extra.primaryAppIcon` (null on builds made before it was carried).
 */
export function defaultRowDetail(primary: string | null): TranslationKey {
    return primary === RELEASE_PRIMARY_ICON ? "appIcon.default.detail" : "appIcon.default.detailDev";
}

export interface AppIconState {
    active: string | null;
    /** Boxed so a request for the primary (name `null`) is not read as no request. */
    pending: { name: string | null } | null;
}

export type AppIconEvent =
    | { kind: "tap"; name: string | null }
    | { kind: "resolved"; name: string | null }
    | { kind: "rejected"; reported: string | null };

/** Returns `state` itself when nothing changes, so a caller can spot a dropped tap by identity. */
export function appIconTransition(state: AppIconState, event: AppIconEvent): AppIconState {
    switch (event.kind) {
        case "tap": {
            // Overlapping setAlternateIconName calls are a documented rejection source, and the last to settle wins.
            return state.pending === null ? { active: event.name, pending: { name: event.name } } : state;
        }
        case "resolved": {
            // A landing for anything but the outstanding request is stale and would resurrect an abandoned icon.
            return state.pending !== null && state.pending.name === event.name
                ? { active: event.name, pending: null }
                : state;
        }
        case "rejected": {
            return { active: event.reported, pending: null };
        }
        default: {
            const unhandled: never = event;
            throw new Error(`Unhandled app icon event: ${JSON.stringify(unhandled)}`);
        }
    }
}
