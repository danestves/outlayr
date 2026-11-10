import { expect, it } from "vite-plus/test";

import { freshProgress, onboardingDue } from "./onboarding";

const empty = { accounts: [], appMeta: [], transactions: [] };
const started = freshProgress(0);

it.each([
    { books: empty, due: true, name: "a ledger nobody has written in", progress: null },
    { books: { ...empty, accounts: [{}] }, due: false, name: "a ledger a phone already filled", progress: null },
    {
        books: { ...empty, appMeta: [{ key: "currencyChosen", value: "true" }] },
        due: false,
        name: "a ledger set up in another browser",
        progress: null,
    },
    {
        books: { accounts: [], appMeta: [{ key: "currencyChosen", value: "true" }], transactions: [{}] },
        due: true,
        name: "a flow left after its first entry",
        progress: started,
    },
    { books: empty, due: false, name: "a flow closed without an entry", progress: { ...started, finished: true } },
])("asks for onboarding on $name: $due", ({ books, due, progress }) => {
    expect(onboardingDue(progress, books)).toBe(due);
});
