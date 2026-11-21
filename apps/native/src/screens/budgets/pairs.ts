export function pairs<T>(items: readonly T[]): [T, T | undefined][] {
    const rows: [T, T | undefined][] = [];
    for (let index = 0; index < items.length; index += 2) {
        const first = items[index];
        if (first === undefined) {
            break;
        }
        rows.push([first, items[index + 1]]);
    }
    return rows;
}
