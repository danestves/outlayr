/**
 * react-native-screens detent fractions are of the sheet's MAXIMUM height (the screen less the large-sheet top
 * inset), not of the screen: 0.5 for "half" lands ~40pt short of SwiftUI's `.medium`.
 */
export const CATEGORY_DETENT = 0.65;
export const SUBCATEGORY_DETENT = 0.55;
export const ACCOUNT_DETENT = 0.72;
export const INSTALLMENT_PAY_DETENT = 0.62;

/** Mirrors Swift `IdentityHero.pickerHeight`. */
const PICKER_HEIGHT = 430;
/** Measured on an iPhone 17 Pro: a 0.5 fraction gave a 423pt sheet on an 874pt window. */
export const LARGE_SHEET_TOP_INSET = 38;

/** Swift pins the picker to a height; react-native-screens only takes fractions, so this varies per screen size. */
export function identityPickerDetent(windowHeight: number): number {
    return heightDetent(PICKER_HEIGHT, windowHeight);
}

export function heightDetent(height: number, windowHeight: number): number {
    const maxDetent = Math.max(1, windowHeight - LARGE_SHEET_TOP_INSET);
    return Math.min(1, height / maxDetent);
}

/**
 * UIKit applies a sheet's selected detent only once, so growing the parent to `.large` for the 430pt picker
 * (as Swift's `NewCategoryAlert.openPicker` does) means re-declaring which detents exist at all.
 */
export const LARGE_ONLY = [1];
