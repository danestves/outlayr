import { useEffect, useEffectEvent } from "react";

export function useScrollSpy(
    ids: readonly string[],
    rootMargin: string,
    onChange: (intersecting: ReadonlySet<string>, entries: readonly IntersectionObserverEntry[]) => void
) {
    const notify = useEffectEvent(onChange);
    const key = ids.join(" ");
    // oxlint-disable-next-line outlayr/react-effect-budget -- an IntersectionObserver on headings elsewhere in the document, found by id after render
    useEffect(() => {
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
                notify(intersecting, entries);
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
    }, [key, rootMargin]);
}
