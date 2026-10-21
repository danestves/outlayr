/**
 * `build` for a list that grows at its end: when the items start with the previous call's (same objects, same
 * order), only the new tail is built and `join`ed on. It holds the previous call, so make one per list.
 */
export function growing<Item, Built>(
    build: (items: readonly Item[]) => Built,
    join: (held: Built, added: Built, items: readonly Item[]) => Built
): (items: readonly Item[]) => Built {
    let previous: { built: Built; items: readonly Item[] } | null = null;
    return (items) => {
        const held = previous;
        const grew =
            held !== null &&
            held.items.length <= items.length &&
            held.items.every((item, index) => item === items[index]);
        const built = grew ? join(held.built, build(items.slice(held.items.length)), items) : build(items);
        previous = { built, items };
        return built;
    };
}
