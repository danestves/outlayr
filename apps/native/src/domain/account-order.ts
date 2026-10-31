export function displayOrder<T>(items: readonly T[], byHand: boolean, balanceOf: (item: T) => number): T[] {
    const rows = [...items];
    return byHand ? rows : rows.sort((a, b) => balanceOf(b) - balanceOf(a));
}

export function pickerOrder<T extends { name: string }>(accounts: readonly T[], byHand: boolean): T[] {
    const rows = [...accounts];
    return byHand ? rows : rows.sort((a, b) => a.name.localeCompare(b.name));
}
