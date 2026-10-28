import { TextDecoder, TextEncoder } from "node:util";

import { afterEach, vi } from "vite-plus/test";

Object.assign(globalThis, {
    TextDecoder,
    TextEncoder,
    Uint8Array: Object.getPrototypeOf(Buffer.prototype).constructor,
});

vi.mock("@/i18n/context", () => ({
    LanguageProvider: ({ children }: { children: unknown }) => children,
    useLanguage: () => ({ language: "en" }),
    useTranslation: () => (key: string) => key,
}));

Object.assign(globalThis, { __DEV__: true });

vi.mock("expo-sqlite", async (importOriginal) => ({
    ...(await importOriginal<typeof import("expo-sqlite")>()),
    addDatabaseChangeListener: () => ({ remove: () => undefined }),
}));

if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    afterEach(cleanup);
}
