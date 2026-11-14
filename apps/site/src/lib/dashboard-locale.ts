import type { Locale } from "@outlayr/shared/i18n";
import { defaultLocale, isDeclaredLocale } from "intlayer";

const KEY = "outlayr-dashboard-locale";
const listeners = new Set<() => void>();

export { locales as DASHBOARD_LOCALES } from "intlayer";

export function readDashboardLocale(): Locale {
    try {
        const stored = localStorage.getItem(KEY);
        return stored !== null && isDeclaredLocale(stored) ? stored : defaultLocale;
    } catch {
        return defaultLocale;
    }
}

export const serverDashboardLocale = (): Locale => defaultLocale;

export function subscribeDashboardLocale(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function chooseDashboardLocale(locale: Locale) {
    try {
        localStorage.setItem(KEY, locale);
    } catch {
        return;
    }
    for (const listener of listeners) {
        listener();
    }
}
