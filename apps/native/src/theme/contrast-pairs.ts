/* Shared by `token-contrast.test.ts` and `material-scheme.ts`, which must agree. */

/** Which token lands on which ground is not statically knowable, so text clears all of them. */
export const GROUNDS = ["background", "surface", "surface-secondary", "grouped-background"] as const;

export const TEXT_TOKENS = [
    "foreground",
    "muted",
    "subtle",
    "grammar",
    "accent",
    "expense",
    "income",
    "future",
    "tint",
    "danger",
    "over-budget",
] as const;

/** Only ever over their own fill (`bg-accent`), never a page ground. */
export const INVERSE_TOKENS = {
    "accent-foreground": "accent",
    background: "accent",
    "surface-foreground": "surface",
    "surface-secondary-foreground": "surface-secondary",
} as const satisfies Record<string, string>;

export const M3_SURFACES = [
    "m3-surface",
    "m3-surface-container-lowest",
    "m3-surface-container-low",
    "m3-surface-container",
    "m3-surface-container-high",
    "m3-surface-container-highest",
] as const;

/** `m3-primary` and `m3-error` are also text colours over the surfaces. */
export const M3_TEXT_ON = {
    "m3-error": M3_SURFACES,
    "m3-inverse-on-surface": ["m3-inverse-surface"],
    "m3-on-error": ["m3-error"],
    "m3-on-error-container": ["m3-error-container"],
    "m3-on-primary": ["m3-primary"],
    "m3-on-primary-container": ["m3-primary-container"],
    "m3-on-secondary": ["m3-secondary"],
    "m3-on-secondary-container": ["m3-secondary-container"],
    "m3-on-surface": M3_SURFACES,
    "m3-on-surface-variant": M3_SURFACES,
    "m3-on-tertiary": ["m3-tertiary"],
    "m3-on-tertiary-container": ["m3-tertiary-container"],
    "m3-primary": M3_SURFACES,
} as const satisfies Record<string, readonly string[]>;

/** `--fr-vermilion` is the eyebrow only; on a dark `bg-fr-card` it would fail the floor (4.42:1). */
export const FIRST_RUN_TEXT = {
    "fr-ink": ["fr-ground", "fr-card"],
    "fr-muted": ["fr-ground", "fr-card"],
    "fr-vermilion": ["fr-ground"],
} as const satisfies Record<string, readonly string[]>;

/** Literal white text is neither a token nor on a ground, so it is named here or measured nowhere. */
export const WHITE_TEXT_FILLS = ["danger-fill", "gold-fill"] as const;

/** Badges write `--<tone>-on-wash` over `--<tone>` at this alpha, laid over `--background`. */
export const WASH_ALPHA = 0.2;

export const ON_WASH = {
    "danger-on-wash": "danger",
    "income-on-wash": "income",
} as const;
