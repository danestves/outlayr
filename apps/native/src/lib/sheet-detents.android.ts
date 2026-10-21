import { StatusBar } from "react-native";

/**
 * On Android a detent is a fraction of the stack container less the status bar
 * (`SheetDelegate.tryResolveSafeAreaSpaceForSheet`). The fractions are iOS's: smaller ones clip forms on short phones.
 */
export const CATEGORY_DETENT = 0.65;
export const SUBCATEGORY_DETENT = 0.55;
export const ACCOUNT_DETENT = 0.72;
export const INSTALLMENT_PAY_DETENT = 0.62;

/** Taller than iOS's 430: header, segmented buttons, search and swatch rail take ~270dp before four glyph rows. */
const PICKER_HEIGHT = 560;
export const LARGE_SHEET_TOP_INSET = StatusBar.currentHeight ?? 0;

export function identityPickerDetent(windowHeight: number): number {
    return heightDetent(PICKER_HEIGHT, windowHeight);
}

export function heightDetent(height: number, windowHeight: number): number {
    const maxDetent = Math.max(1, windowHeight - LARGE_SHEET_TOP_INSET);
    return Math.min(1, height / maxDetent);
}

/**
 * Don't switch a live sheet to it on Android: the native sheet keeps the detents it was created with, and a swipe
 * to a missing lower one crashes react-native-screens ("Invalid state 4 for detentCount 1").
 */
export const LARGE_ONLY = [1];
