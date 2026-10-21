import { CATEGORY_PALETTE } from "@/data/categories-core";

/** The next unused palette colour; once every one is taken, the palette cycles. */
export function firstAvailableColor(used: ReadonlySet<string>): string {
    const free = CATEGORY_PALETTE.find((hex) => !used.has(hex));
    return free ?? CATEGORY_PALETTE[used.size % CATEGORY_PALETTE.length];
}
