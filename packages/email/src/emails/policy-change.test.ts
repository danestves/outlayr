import { expect, test } from "vite-plus/test";

import { policyChangeEmail } from "./policy-change";

const render = (document: "privacy" | "terms", language: "en" | "fr") =>
    policyChangeEmail({
        documents: [{ changes: [{ label: "Invites" }], document }],
        effectiveAtMs: Date.UTC(2027, 0, 1),
        email: "ana@example.com",
        language,
        timeZone: "UTC",
    });

test("links to the document in the reader's language", async () => {
    const { text } = await render("terms", "fr");
    expect(text).toContain("https://tryoutlayr.com/fr/terms");
});
