import { useSyncExternalStore } from "react";

export const THEMES = ["system", "light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

const KEY = "outlayr-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const THEME_COLOR = { dark: "#131209", light: "#ffffff" } as const;

export const THEME_SCRIPT = `document.documentElement.classList.add("js");try{var c=localStorage.getItem("${KEY}"),d=c==="dark"||(c!=="light"&&matchMedia("${DARK_QUERY}").matches),t=d?"dark":"light";document.documentElement.dataset.theme=t;document.querySelector('meta[name="theme-color"]').content=d?"${THEME_COLOR.dark}":"${THEME_COLOR.light}"}catch(e){}`;

export function readTheme(): Theme {
    try {
        const stored = localStorage.getItem(KEY);
        return stored === "light" || stored === "dark" ? stored : "system";
    } catch {
        return "system";
    }
}

const listeners = new Set<() => void>();

export function subscribeTheme(listener: () => void) {
    listeners.add(listener);
    const stopWatching = watchSystemTheme(() => {
        if (readTheme() === "system") {
            paintTheme("system");
        }
    });
    return () => {
        listeners.delete(listener);
        stopWatching();
    };
}

export function chooseTheme(theme: Theme) {
    try {
        if (theme === "system") {
            localStorage.removeItem(KEY);
        } else {
            localStorage.setItem(KEY, theme);
        }
    } catch {
        return;
    }
    paintTheme(theme);
    for (const listener of listeners) {
        listener();
    }
}

function resolveTheme(theme: Theme) {
    if (theme !== "system") {
        return theme;
    }
    return matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

export function paintTheme(theme: Theme) {
    const resolved = resolveTheme(theme);
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[resolved]);
}

function watchSystemTheme(onChange: () => void) {
    const query = matchMedia(DARK_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

export function isDarkPainted() {
    return document.documentElement.dataset.theme === "dark";
}

function subscribePainted(onChange: () => void) {
    const watcher = new MutationObserver(onChange);
    watcher.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => watcher.disconnect();
}

export function usePaintedTheme(): "dark" | "light" | null {
    return useSyncExternalStore(
        subscribePainted,
        () => (isDarkPainted() ? "dark" : "light"),
        () => null
    );
}
