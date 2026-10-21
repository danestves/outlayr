export const FALLBACK_IDENTITY_COLOR = "#767676";

export interface TransactionIdentitySource {
    categoryColor: string | null;
    categoryEmoji: string | null;
    categoryIcon: string | null;
    customColor: string | null;
    emoji: string | null;
    icon: string | null;
    imageColor: string | null;
}

export interface TransactionIdentity {
    color: string;
    emoji: string | null;
    icon: string | null;
}

function present(value: string | null | undefined): string | null {
    return value != null && value !== "" ? value : null;
}

const NO_SYMBOL = { emoji: null, icon: null } as const;

/** Storage is icon XOR emoji, so exactly one side of the pair survives. */
function symbol(
    icon: string | null | undefined,
    emoji: string | null | undefined
): Pick<TransactionIdentity, "icon" | "emoji"> | null {
    const resolvedIcon = present(icon);
    if (resolvedIcon != null) {
        return { emoji: null, icon: resolvedIcon };
    }
    const resolvedEmoji = present(emoji);
    if (resolvedEmoji != null) {
        return { emoji: resolvedEmoji, icon: null };
    }
    return null;
}

// Ports Swift's `displaySymbol`: the symbol falls through as a pair, or an emoji-only row paints its category's icon.
export function resolveTransactionIdentity(source: TransactionIdentitySource): TransactionIdentity {
    const resolved =
        symbol(source.icon, source.emoji) ?? symbol(source.categoryIcon, source.categoryEmoji) ?? NO_SYMBOL;
    return {
        ...resolved,
        color:
            present(source.customColor) ??
            present(source.imageColor) ??
            present(source.categoryColor) ??
            FALLBACK_IDENTITY_COLOR,
    };
}
