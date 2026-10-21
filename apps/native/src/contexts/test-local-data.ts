import type { LocalDataContextValue } from "@/contexts/local-data-context";

// A mock returning only the member under test has an incomplete type, so pass that member as an override here.
export const testLocalData = (overrides: Partial<LocalDataContextValue> = {}): LocalDataContextValue => ({
    db: null,
    error: null,
    retry: () => {
        // a test that asserts on retry passes its own spy
    },
    status: "ready",
    ...overrides,
});
