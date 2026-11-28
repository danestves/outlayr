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

test("a framed notice keeps the effective date and the policy link", async () => {
    const { subject, text } = await policyChangeEmail({
        documents: [{ changes: [{ label: "Where your data is stored" }], document: "privacy" }],
        effectiveAtMs: Date.UTC(2027, 0, 1),
        email: "ana@example.com",
        framing: { lead: ["We moved our servers."], preview: "Why.", subject: "Your data moved" },
        language: "en",
        timeZone: "UTC",
    });
    expect(subject).toBe("Your data moved");
    expect(text).toContain("1 January 2027");
    expect(text).toContain("https://tryoutlayr.com/privacy");
});
