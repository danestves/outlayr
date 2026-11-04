export function firstEntryOfferDue(state: {
    arriving: boolean;
    consentDue: boolean;
    locked: boolean;
    onLog: boolean;
    onTabs: boolean;
    savedThisSession: boolean;
    shown: boolean;
    transactions: number;
    updateDue: boolean;
}): boolean {
    const sheetFirst = state.consentDue || state.updateDue || (state.arriving && state.onLog);
    return (
        state.onTabs &&
        state.locked &&
        state.savedThisSession &&
        !state.shown &&
        state.transactions === 1 &&
        !sheetFirst
    );
}
