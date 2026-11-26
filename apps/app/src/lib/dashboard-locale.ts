import type { Locale } from "@outlayr/shared/i18n";
import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";
import { defaultLocale, isDeclaredLocale, locales } from "intlayer";

import { matchAcceptLanguage } from "./accept-language";

const COOKIE = "outlayr-locale";
const LEGACY_KEY = "outlayr-dashboard-locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const listeners = new Set<() => void>();
let chosen: Locale | null = null;

export { locales as DASHBOARD_LOCALES } from "intlayer";

const asLocale = (value: string | null | undefined): Locale | null =>
    value !== null && value !== undefined && isDeclaredLocale(value) ? value : null;

const readCookieLocale = (): Locale | null => {
    if (typeof document === "undefined") {
        return null;
    }
    for (const part of document.cookie.split(";")) {
        const [name, ...rest] = part.trim().split("=");
        if (name === COOKIE) {
            return asLocale(rest.join("="));
        }
    }
    return null;
};

const readLegacyLocale = (): Locale | null => {
    try {
        return asLocale(localStorage.getItem(LEGACY_KEY));
    } catch {
        return null;
    }
};

export function readDashboardLocale(): Locale {
    return chosen ?? readCookieLocale() ?? readLegacyLocale() ?? defaultLocale;
}

const persistDashboardLocale = createServerFn({ method: "POST" })
    .validator((locale: Locale): Locale => (isDeclaredLocale(locale) ? locale : defaultLocale))
    .handler(({ data }) => {
        setCookie(COOKIE, data, { maxAge: ONE_YEAR_SECONDS, path: "/", sameSite: "lax" });
    });

export const requestDashboardLocale = createIsomorphicFn()
    .server((): Locale => {
        const cookie = asLocale(getCookie(COOKIE));
        if (cookie !== null) {
            return cookie;
        }
        return matchAcceptLanguage(getRequestHeader("accept-language"), locales) ?? defaultLocale;
    })
    .client(readDashboardLocale);

export const serverDashboardLocale = (locale: Locale) => (): Locale => locale;

export function subscribeDashboardLocale(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function chooseDashboardLocale(locale: Locale) {
    chosen = locale;
    persistDashboardLocale({ data: locale }).catch(() => undefined);
    for (const listener of listeners) {
        listener();
    }
}

export function migrateDashboardLocale() {
    if (readCookieLocale() !== null || chosen !== null) {
        return;
    }
    const legacy = readLegacyLocale();
    if (legacy === null) {
        return;
    }
    persistDashboardLocale({ data: legacy }).catch(() => undefined);
}
