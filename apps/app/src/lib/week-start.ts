const LEDGER_SUNDAY = 1;
const LEDGER_MONDAY = 2;
const ISO_MONDAY = 1;
const ISO_SUNDAY = 7;

function isoFirstDay(locale: string): number | null {
    try {
        return new Intl.Locale(locale).getWeekInfo?.().firstDay ?? null;
    } catch {
        return null;
    }
}

/** `setting` is the ledger's 1 Sunday / 2 Monday, or null when the person has not chosen one. */
export function weekStart(setting: number | null, locale: string): number {
    if (setting === LEDGER_SUNDAY || setting === LEDGER_MONDAY) {
        return setting;
    }
    return isoFirstDay(locale) === ISO_MONDAY ? LEDGER_MONDAY : LEDGER_SUNDAY;
}

export function weekStartIso(firstWeekday: number): number {
    return firstWeekday === LEDGER_MONDAY ? ISO_MONDAY : ISO_SUNDAY;
}
