export function watchGround(target: HTMLElement, lineAt: () => number) {
    const grounds = [...document.querySelectorAll("[data-night-ground]")];
    let frame = 0;
    const paint = () => {
        frame = 0;
        const line = lineAt();
        const night = grounds.some((ground) => {
            const { bottom, top } = ground.getBoundingClientRect();
            return top <= line && bottom > line;
        });
        const next = night ? "night" : "day";
        if (target.dataset.ground !== next) {
            target.dataset.ground = next;
        }
    };
    const schedule = () => {
        frame ||= requestAnimationFrame(paint);
    };
    target.dataset.ground = "day";
    schedule();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    return () => {
        cancelAnimationFrame(frame);
        removeEventListener("scroll", schedule);
        removeEventListener("resize", schedule);
        delete target.dataset.ground;
    };
}
