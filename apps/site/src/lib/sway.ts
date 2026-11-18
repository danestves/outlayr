const QUERY = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

const targets = new Set<HTMLElement>();
const visible = new Set<HTMLElement>();
let observer: IntersectionObserver | null = null;
let frame = 0;
let x = 0;
let y = 0;

function apply() {
    frame = 0;
    for (const target of visible) {
        target.style.setProperty("--mx", x.toFixed(3));
        target.style.setProperty("--my", y.toFixed(3));
    }
}

function move(event: PointerEvent) {
    x = (event.clientX / innerWidth) * 2 - 1;
    y = (event.clientY / innerHeight) * 2 - 1;
    if (frame === 0) {
        frame = requestAnimationFrame(apply);
    }
}

function stop() {
    removeEventListener("pointermove", move);
    cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    observer = null;
}

export function sway(target: HTMLElement | null) {
    if (!target || !matchMedia(QUERY).matches) {
        return;
    }
    if (observer === null) {
        observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && entry.target instanceof HTMLElement) {
                    visible.add(entry.target);
                } else if (entry.target instanceof HTMLElement) {
                    visible.delete(entry.target);
                }
            }
        });
        addEventListener("pointermove", move, { passive: true });
    }
    targets.add(target);
    observer.observe(target);
    return () => {
        targets.delete(target);
        visible.delete(target);
        observer?.unobserve(target);
        if (targets.size === 0) {
            stop();
        }
    };
}
