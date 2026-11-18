const VISIBLE = 0.45;

export function playScene(target: HTMLElement | null) {
    if (!target || CSS.supports("animation-timeline: view()")) {
        return;
    }
    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry?.isIntersecting) {
                target.dataset.scene = "on";
                observer.disconnect();
            }
        },
        { threshold: VISIBLE }
    );
    observer.observe(target);
    return () => observer.disconnect();
}
