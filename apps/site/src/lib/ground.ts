const RESIZE_MS = 150;

export function watchGround(target: HTMLElement, lineAt: () => number) {
    const night = new Set<Element>();
    let observer: IntersectionObserver | null = null;
    let timer = 0;
    const build = () => {
        observer?.disconnect();
        night.clear();
        const line = Math.round(lineAt());
        observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        night.add(entry.target);
                    } else {
                        night.delete(entry.target);
                    }
                }
                target.dataset.ground = night.size > 0 ? "night" : "day";
            },
            { rootMargin: `${-line}px 0px ${line + 1 - innerHeight}px 0px` }
        );
        for (const ground of document.querySelectorAll("[data-night-ground]")) {
            observer.observe(ground);
        }
    };
    const resize = () => {
        clearTimeout(timer);
        timer = window.setTimeout(build, RESIZE_MS);
    };
    target.dataset.ground = "day";
    const frame = requestAnimationFrame(build);
    addEventListener("resize", resize, { passive: true });
    return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        removeEventListener("resize", resize);
        observer?.disconnect();
        delete target.dataset.ground;
    };
}
