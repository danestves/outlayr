export function catchUpPaywallDue(state: {
    arriving: boolean;
    locked: boolean;
    onLog: boolean;
    onTabs: boolean;
    reviewPending: boolean;
    savedThisSession: boolean;
    seen: boolean;
    transactions: number;
    updateDue: boolean;
}): boolean {
    return (
        state.onTabs &&
        state.locked &&
        !state.seen &&
        state.savedThisSession &&
        state.transactions >= 2 &&
        !state.updateDue &&
        !(state.arriving && state.onLog) &&
        !state.reviewPending
    );
}
