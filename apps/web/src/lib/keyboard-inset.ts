export function watchKeyboardInset() {
    const viewport = window.visualViewport;
    if (!viewport) {
        return;
    }
    const root = document.documentElement;
    const update = () => {
        // Pinch zoom also shrinks the visual viewport; only an unzoomed one means the keyboard.
        const inset = viewport.scale === 1 ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
        root.style.setProperty("--keyboard-inset", `${inset}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
        viewport.removeEventListener("resize", update);
        viewport.removeEventListener("scroll", update);
        root.style.removeProperty("--keyboard-inset");
    };
}
