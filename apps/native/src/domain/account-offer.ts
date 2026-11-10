export function accountOfferDue(state: {
    arriving: boolean;
    held: boolean;
    onLog: boolean;
    onTabs: boolean;
    savedThisSession: boolean;
    signedOut: boolean;
    transactions: number;
    updateDue: boolean;
}): boolean {
    const sheetFirst = state.updateDue || (state.arriving && state.onLog);
    return (
        state.onTabs &&
        state.held &&
        state.signedOut &&
        state.savedThisSession &&
        state.transactions === 1 &&
        !sheetFirst
    );
}
