import type { ImagePickerErrorResult, ImagePickerResult } from "expo-image-picker";

import { CATEGORY_PALETTE } from "@/data/categories-core";
import type { TranslationKey } from "@/i18n/catalog";

export interface IdentitySelection {
    color: string | null;
    emoji: string | null;
    icon: string | null;
    photoColor: string | null;
    photoUri: string | null;
}

export type IdentityTab = "photo" | "emoji" | "icons";

export const TRANSACTION_TABS: readonly IdentityTab[] = ["photo", "emoji", "icons"];
export const CATEGORY_TABS: readonly IdentityTab[] = ["icons", "emoji"];

export const IDENTITY_TAB_LABEL = {
    emoji: "transaction.identity.tab.emoji",
    icons: "transaction.identity.tab.icons",
    photo: "transaction.identity.tab.photo",
} satisfies Record<IdentityTab, TranslationKey>;

export interface IdentityPickerContentProps {
    onChange: (next: IdentitySelection) => void;
    onDone: () => void;
    /** Off for income and for subcategories. */
    showsColorRail?: boolean;
    tabs?: readonly IdentityTab[];
    tint?: string;
    /** Colors sibling expense categories already own; dimmed and unpickable. */
    usedColors?: readonly string[];
    value: IdentitySelection;
}

export function initialIdentityTab(value: IdentitySelection, tabs: readonly IdentityTab[]): IdentityTab {
    if (value.icon && tabs.includes("icons")) {
        return "icons";
    }
    if (value.emoji && tabs.includes("emoji")) {
        return "emoji";
    }
    if (value.photoUri && tabs.includes("photo")) {
        return "photo";
    }
    return tabs[0];
}

export function withEmoji(value: IdentitySelection, emoji: string): IdentitySelection {
    return {
        color: value.color,
        emoji,
        icon: null,
        photoColor: null,
        photoUri: null,
    };
}

/** An icon needs a colour to be drawn in, so an unset one takes the palette's first. */
export function withIcon(value: IdentitySelection, icon: string): IdentitySelection {
    return {
        color: value.color ?? CATEGORY_PALETTE[0],
        emoji: null,
        icon,
        photoColor: null,
        photoUri: null,
    };
}

export function withPhoto(value: IdentitySelection, photoUri: string, hues: readonly string[]): IdentitySelection {
    return {
        color: value.color,
        emoji: null,
        icon: null,
        photoColor: hues[0] ?? null,
        photoUri,
    };
}

/** Null for a cancel, an error, or nothing pending from `getPendingResultAsync`. */
export function pickedPhotoUri(result: ImagePickerResult | ImagePickerErrorResult | null): string | null {
    if (result == null || !("canceled" in result) || result.canceled) {
        return null;
    }
    return result.assets[0]?.uri ?? null;
}
