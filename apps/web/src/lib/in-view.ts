import { useState } from "react";

const IN_VIEW_THRESHOLD = 0.3;

export function useInView<T extends Element>() {
    const [inView, setInView] = useState(false);
    const ref = (node: T | null) => {
        if (node === null) {
            return;
        }
        const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), {
            threshold: IN_VIEW_THRESHOLD,
        });
        observer.observe(node);
        return () => observer.disconnect();
    };
    return { inView, ref };
}
