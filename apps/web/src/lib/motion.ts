function spotlight(event: PointerEvent) {
    const card = event.target instanceof Element ? event.target.closest("[data-spot]") : null;
    if (!(card instanceof HTMLElement)) {
        return;
    }
    const box = card.getBoundingClientRect();
    card.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
    card.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
}

const COUNT_MS = 1200;

function write(element: Element, value: string) {
    const text = element.firstChild;
    if (text instanceof Text) {
        text.data = value;
    } else {
        element.textContent = value;
    }
}

function countUp(element: HTMLElement) {
    const target = Number(element.dataset.count);
    const start = performance.now();
    const tick = (now: number) => {
        const progress = Math.min((now - start) / COUNT_MS, 1);
        write(element, Math.round(target * (1 - (1 - progress) ** 4)).toLocaleString("en-US"));
        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    };
    requestAnimationFrame(tick);
}

let scanner: (() => void) | null = null;

export function startMotion() {
    const reveals = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-in");
                reveals.unobserve(entry.target);
            }
        }
    });
    const words = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                entry.target.classList.toggle("is-on", entry.isIntersecting || entry.boundingClientRect.top < 0);
            }
        },
        { rootMargin: "0px 0px -40% 0px" }
    );
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lives = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-live");
                    lives.unobserve(entry.target);
                    if (!reduced) {
                        for (const count of entry.target.querySelectorAll<HTMLElement>("[data-count]")) {
                            countUp(count);
                        }
                    }
                }
            }
        },
        { threshold: 0.35 }
    );
    const scan = () => {
        for (const element of document.querySelectorAll("[data-live]:not(.is-live)")) {
            lives.observe(element);
            if (!reduced) {
                for (const count of element.querySelectorAll<HTMLElement>("[data-count]:not([data-counted])")) {
                    write(count, "0");
                    count.dataset.counted = "";
                }
            }
        }
        for (const element of document.querySelectorAll("[data-reveal]:not(.is-in)")) {
            reveals.observe(element);
        }
        for (const element of document.querySelectorAll("[data-word]")) {
            words.observe(element);
        }
    };
    const mutations = new MutationObserver(scan);
    scanner = () => {
        scan();
        mutations.observe(document.body, { childList: true, subtree: true });
    };
    const finePointer = matchMedia("(pointer: fine)").matches;
    if (finePointer) {
        document.addEventListener("pointermove", spotlight, { passive: true });
    }
    return () => {
        scanner = null;
        reveals.disconnect();
        lives.disconnect();
        words.disconnect();
        mutations.disconnect();
        document.removeEventListener("pointermove", spotlight);
    };
}

export function scanMotion() {
    const frame = requestAnimationFrame(() => scanner?.());
    return () => cancelAnimationFrame(frame);
}
