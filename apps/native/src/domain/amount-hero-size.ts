export const AMOUNT_HERO_MAX_SIZE = 62;
export const AMOUNT_HERO_MIN_SIZE = 26;

/**
 * Mean advance per character of a grouped figure in SF Pro Rounded Semibold, in em (digits ~0.60, separators
 * ~0.28). An estimate: NumberFlow draws its own digit views, so no width is reported before layout.
 */
const ADVANCE_PER_CHAR = 0.58;

/** Room the currency symbol and its gap take out of the line. */
export const SYMBOL_ALLOWANCE = 26;

export function amountHeroLength(amount: number, minorUnits: number): number {
    const whole = Math.floor(Math.abs(amount));
    const integerDigits = whole.toString().length;
    const separators = Math.floor((integerDigits - 1) / 3);
    const fraction = minorUnits > 0 ? minorUnits + 1 : 0;
    return integerDigits + separators + fraction;
}

/** A NumberFlow has a fixed size (no `minimumScaleFactor`), so without this a nine-figure amount overflows. */
export function amountHeroFontSize(amount: number, minorUnits: number, contentWidth: number): number {
    const available = contentWidth - SYMBOL_ALLOWANCE;
    if (available <= 0) {
        return AMOUNT_HERO_MIN_SIZE;
    }
    const fits = available / (amountHeroLength(amount, minorUnits) * ADVANCE_PER_CHAR);
    return Math.max(AMOUNT_HERO_MIN_SIZE, Math.min(AMOUNT_HERO_MAX_SIZE, fits));
}
