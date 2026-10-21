/** One level deep: a `Date` column compares by its time, any other object only by identity. */
function sameColumn<TColumn>(a: TColumn, b: TColumn): boolean {
    return Object.is(a, b) || (a instanceof Date && b instanceof Date && a.getTime() === b.getTime());
}

function sameRow<TRow extends object>(a: TRow, b: TRow): boolean {
    if (Object.keys(a).length !== Object.keys(b).length) {
        return false;
    }
    for (const key in a) {
        if (!(key in b && sameColumn(a[key], b[key]))) {
            return false;
        }
    }
    return true;
}

// Lets `useLiveQuery` keep its cached array when drizzle rebuilt identical row objects.
export function sameRows<TRow extends object>(a: readonly TRow[], b: readonly TRow[]): boolean {
    return a.length === b.length && a.every((row, i) => sameRow(row, b[i]));
}
