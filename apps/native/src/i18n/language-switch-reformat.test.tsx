import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

jest.mock<Partial<typeof import("expo-localization")>>("expo-localization", () => ({
    getLocales: jest.fn<typeof import("expo-localization").getLocales>(),
}));

import { getLocales } from "expo-localization";
import type { Locale } from "expo-localization";

import { DayTotal } from "@/components/amount-text";
import { testLocale as mockTestLocale } from "@/i18n/test-locale";

import { LanguageProvider } from "./context";

// This suite is the module under test, so it opts out of jest/i18n-key-stub.js.
jest.unmock("@/i18n/context");

const mockGetLocales = jest.mocked(getLocales);

function setDeviceLanguage(tag: string, overrides: Partial<Locale> = {}) {
    mockGetLocales.mockReturnValue([mockTestLocale({ languageTag: tag, ...overrides })]);
}

const realAddEventListener = AppState.addEventListener;

function watchAppState() {
    const listeners: ((status: AppStateStatus) => void)[] = [];
    AppState.addEventListener = ((event: string, listener: unknown) => {
        if (event === "change") {
            listeners.push(listener as (status: AppStateStatus) => void);
        }
        return { remove: jest.fn() };
    }) as typeof AppState.addEventListener;
    return {
        async returnToForeground() {
            await act(async () => {
                for (const listener of listeners) {
                    listener("active");
                }
            });
        },
    };
}

afterEach(() => {
    AppState.addEventListener = realAddEventListener;
    mockGetLocales.mockReset();
});

const TOTALS = [{ amount: -760.24, currencyCode: "USD", transactionCount: 1 }];

/**
 * `DayTotal` formats money but translates nothing: language reaches formatters through a module global, so a
 * component outside the language context is bailed out of the re-render and keeps the previous locale.
 */
describe("changing the device language mid-session", () => {
    it("reformats money in a component that formats but does not translate", async () => {
        setDeviceLanguage("en-US");
        const appState = watchAppState();
        await act(async () => {
            render(
                <LanguageProvider>
                    <DayTotal totals={TOTALS} />
                </LanguageProvider>
            );
        });

        expect(screen.getByText("-$760.24")).toBeTruthy();

        setDeviceLanguage("es-VE", { decimalSeparator: ",", digitGroupingSeparator: ".", regionCode: "VE" });
        await appState.returnToForeground();

        expect(screen.getByText("-$760,24")).toBeTruthy();
    });
});
