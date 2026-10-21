/** A full-height drag stays inside about a hundred stops, so the line snaps rather than slides. */
export const LIMIT_STEP = 25;

/**
 * Four fifths of this window's spend, so the line starts where the curve already crosses. Nothing spent stays
 * zero, and the sheet opens the keypad rather than proposing a number out of the air.
 */
export function suggestedLimit(spent: number): number {
    return spent <= 0 ? 0 : Math.max(LIMIT_STEP, Math.round((spent * 0.8) / LIMIT_STEP) * LIMIT_STEP);
}
