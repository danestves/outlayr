import type { FlatSectionListItem } from "@legendapp/list/section-list";

function sameData<T>(a: T, b: T): boolean {
    if (Object.is(a, b)) {
        return true;
    }
    if (a instanceof Date || b instanceof Date) {
        return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
    }
    if (!(a instanceof Object && b instanceof Object)) {
        return false;
    }
    const left = Object.entries(a);
    const right = new Map(Object.entries(b));
    return (
        left.length === right.size && left.every(([key, value]) => right.has(key) && sameData(value, right.get(key)))
    );
}

/** A header compares its whole section (its share action carries the rows); a row also compares `view`. */
export function logEntriesEqual<Item, Section extends { view: unknown }>(
    previous: FlatSectionListItem<Item, Section>,
    next: FlatSectionListItem<Item, Section>
): boolean {
    if (previous.kind === "header" && next.kind === "header") {
        return sameData(previous.section, next.section);
    }
    if (previous.kind === "item" && next.kind === "item") {
        return sameData(previous.item, next.item) && sameData(previous.section.view, next.section.view);
    }
    return false;
}
