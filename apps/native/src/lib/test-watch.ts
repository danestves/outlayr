export function watchable<A>() {
    const listeners = new Set<(value: A) => void>();
    return {
        emit: (value: A) => {
            for (const listener of listeners) {
                listener(value);
            }
        },
        listeners,
        watch: (listener: (value: A) => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}
