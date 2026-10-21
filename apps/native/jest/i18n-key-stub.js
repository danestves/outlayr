// Replaces the module outright: the real one reaches Skia, which jest-expo does not transform.
// A test of `@/i18n/context` itself must `jest.unmock` it first, or it exercises this stub and proves nothing.
jest.mock("@/i18n/context", () => ({
    LanguageProvider: ({ children }) => children,
    useLanguage: () => ({ language: "en" }),
    useTranslation: () => (key) => key,
}));
