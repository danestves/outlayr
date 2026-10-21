// SwiftUI's `move(fromOffsets:toOffset:)`: `destination` is an index before the moved items are removed.
export function applyMove<T>(items: readonly T[], sourceIndices: readonly number[], destination: number): T[] {
    const moving = sourceIndices.map((index) => items[index]);
    const rest = items.filter((_, index) => !sourceIndices.includes(index));
    const removedBefore = sourceIndices.filter((index) => index < destination).length;
    const insertAt = destination - removedBefore;
    return [...rest.slice(0, insertAt), ...moving, ...rest.slice(insertAt)];
}

// `to` is the slot the row was dropped on, not SwiftUI's pre-removal offset.
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
    "worklet";
    const next = [...items];
    if (from < 0 || from >= next.length || to < 0 || to >= next.length) {
        return next;
    }
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}

export function slotAt(offset: number, rowHeight: number, count: number): number {
    "worklet";
    if (count <= 0 || rowHeight <= 0) {
        return 0;
    }
    return Math.min(count - 1, Math.max(0, Math.round(offset / rowHeight)));
}
