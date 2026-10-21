import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { AppState, Text } from "react-native";
import type { AppStateStatus } from "react-native";

jest.mock<Partial<typeof import("expo-localization")>>("expo-localization", () => ({
    getLocales: jest.fn<typeof import("expo-localization").getLocales>(),
}));

import { getLocales } from "expo-localization";

import { testLocale as mockTestLocale } from "@/i18n/test-locale";

import { LanguageProvider, useLanguage } from "./context";
import { DEFAULT_LANGUAGE } from "./languages";
import { runtimeLanguage, setRuntimeLanguage } from "./runtime";

// This suite is the module under test, so it opts out of jest/i18n-key-stub.js.
jest.unmock("@/i18n/context");

const mockGetLocales = jest.mocked(getLocales);

const mockDeviceLanguageTag = {
    mockReset: () => mockGetLocales.mockReset(),
    mockReturnValue: (tag: string) => mockGetLocales.mockReturnValue([mockTestLocale({ languageTag: tag })]),
};

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
        async emit(status: AppStateStatus) {
            await act(async () => {
                for (const listener of listeners) {
                    listener(status);
                }
            });
        },
    };
}

function CurrentLanguage() {
    const { language } = useLanguage();
    return <Text testID="language">{language}</Text>;
}

function RuntimeLanguage() {
    useLanguage();
    return <Text testID="runtime">{runtimeLanguage()}</Text>;
}

async function renderProvider(children: ReactNode = <CurrentLanguage />) {
    const appState = watchAppState();
    await act(async () => {
        render(<LanguageProvider>{children}</LanguageProvider>);
    });
    return appState;
}

afterEach(() => {
    AppState.addEventListener = realAddEventListener;
    mockDeviceLanguageTag.mockReset();
    setRuntimeLanguage(DEFAULT_LANGUAGE);
});

describe("languageProvider", () => {
    it("resolves the device language", async () => {
        mockDeviceLanguageTag.mockReturnValue("es-MX");

        await renderProvider();

        expect(screen.getByTestId("language")).toHaveTextContent("es");
    });

    it("follows a device language change made while the app was backgrounded", async () => {
        mockDeviceLanguageTag.mockReturnValue("en-US");
        const appState = await renderProvider();
        expect(screen.getByTestId("language")).toHaveTextContent("en");

        mockDeviceLanguageTag.mockReturnValue("es-MX");
        await appState.emit("active");

        expect(screen.getByTestId("language")).toHaveTextContent("es");
    });

    it("has the runtime language in place before its children render", async () => {
        mockDeviceLanguageTag.mockReturnValue("en-US");
        const appState = await renderProvider(<RuntimeLanguage />);
        expect(screen.getByTestId("runtime")).toHaveTextContent("en");

        mockDeviceLanguageTag.mockReturnValue("es-MX");
        await appState.emit("active");

        expect(screen.getByTestId("runtime")).toHaveTextContent("es");
    });
});
