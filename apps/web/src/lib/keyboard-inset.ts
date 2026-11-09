export function watchKeyboardInset() {
    const viewport = window.visualViewport;
    if (!viewport) {
        return;
    }
    const update = () => {
        const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
        document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
        viewport.removeEventListener("resize", update);
        viewport.removeEventListener("scroll", update);
    };
}
