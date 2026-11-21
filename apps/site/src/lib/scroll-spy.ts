import { useLatest, useMirror } from "@outlayr/shared/lifecycle";

export function useScrollSpy(
    ids: readonly string[],
    rootMargin: string,
    onChange: (intersecting: ReadonlySet<string>, entries: readonly IntersectionObserverEntry[]) => void
) {
    const notify = useLatest(onChange);
    const key = ids.join(" ");
    useMirror([key, rootMargin], () => {
        if (key === "") {
            return;
        }
        const intersecting = new Set<string>();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const { isIntersecting, target } of entries) {
                    if (isIntersecting) {
                        intersecting.add(target.id);
                    } else {
                        intersecting.delete(target.id);
                    }
                }
                notify.current(intersecting, entries);
            },
            { rootMargin }
        );
        for (const id of key.split(" ")) {
            const element = document.querySelector(`#${id}`);
            if (element) {
                observer.observe(element);
            }
        }
        return () => observer.disconnect();
    });
}
