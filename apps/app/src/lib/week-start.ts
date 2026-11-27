const LEDGER_MONDAY = 2;
const ISO_MONDAY = 1;
const ISO_SUNDAY = 7;

export function weekStartIso(firstWeekday: number): number {
    return firstWeekday === LEDGER_MONDAY ? ISO_MONDAY : ISO_SUNDAY;
}
