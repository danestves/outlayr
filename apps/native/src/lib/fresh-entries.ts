const fresh = new Set<string>();
let marked = false;
const listeners = new Set<() => void>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

export const freshEntries = {
    arriving: () => fresh.size > 0,
    has: (id: string) => fresh.has(id),
    mark(id: string, date: Date) {
        if (date.getTime() > Date.now()) {
            return;
        }
        fresh.add(id);
        marked = true;
        emit();
    },
    marked: () => marked,
    settle(id: string) {
        if (fresh.delete(id)) {
            emit();
        }
    },
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
};
