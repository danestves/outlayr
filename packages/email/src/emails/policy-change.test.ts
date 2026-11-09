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

test("only a terms change says that keeping the app accepts it", async () => {
    await expect(render("terms", "en")).resolves.toMatchObject({
        text: expect.stringContaining("If you keep using Outlayr on or after"),
    });
    const { text } = await render("privacy", "en");
    expect(text).not.toContain("If you keep using Outlayr");
});

test("links to the document in the reader's language", async () => {
    const { text } = await render("terms", "fr");
    expect(text).toContain("https://tryoutlayr.com/fr/terms");
});
