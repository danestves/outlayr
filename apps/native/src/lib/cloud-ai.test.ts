import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { receiptScanTransport, voiceThreadTransport } from "./cloud-ai";
import type { ReceiptDraft, ScanRequest, SpeakRequest } from "./cloud-ai";
import { enrichmentTransport, setCloudAuthenticated } from "./convex";

const reply = vi.fn<() => Promise<unknown>>();

vi.mock("./cloud-runtime", () => ({
    cloudRuntime: { convex: { action: () => reply(), mutation: () => reply(), query: () => reply() } },
}));

const DRAFT: ReceiptDraft = {
    accountName: null,
    categoryName: "Groceries",
    currency: "EUR",
    currencySource: "printed",
    currencyUnresolved: false,
    date: "2026-10-29",
    domain: "lidl.de",
    income: false,
    items: [{ name: "Milk", price: 1.19, quantity: 1 }],
    merchant: "Lidl",
    paymentMethod: null,
    subtotal: null,
    tax: null,
    tip: null,
    total: 1.19,
};

const SCAN: ScanRequest = {
    accounts: [],
    categoryTree: [],
    currency: "EUR",
    image: new ArrayBuffer(1),
    today: "2026-10-29",
};

const SPEAK: SpeakRequest = { ...SCAN, audio: new ArrayBuffer(1), threadId: "thread-1" };

const scan = () => Effect.runPromise(receiptScanTransport()(SCAN));

beforeEach(() => {
    reply.mockReset();
});

describe("receiptScanTransport", () => {
    it("reads a reply from a newer backend that carries fields this build does not know", async () => {
        reply.mockResolvedValue({ receipt: { ...DRAFT, loyaltyCard: "1234" }, requestId: "r-1", status: "ok" });

        await expect(scan()).resolves.toStrictEqual({ draft: DRAFT, ok: true });
    });

    it("turns a reply that drifted from the spec into invalidResponse instead of a cast", async () => {
        const { total, ...renamed } = DRAFT;
        reply.mockResolvedValue({ receipt: { ...renamed, totalAmount: total }, status: "ok" });

        await expect(scan()).resolves.toStrictEqual({ ok: false, reason: "invalidResponse" });
    });

    it("treats an ok reply without a receipt as invalidResponse", async () => {
        reply.mockResolvedValue({ receipt: null, status: "ok" });

        await expect(scan()).resolves.toStrictEqual({ ok: false, reason: "invalidResponse" });
    });

    it("passes the server's refusal through so the limit wall can show", async () => {
        reply.mockResolvedValue({ receipt: null, status: "quotaExceeded" });

        await expect(scan()).resolves.toStrictEqual({ ok: false, reason: "quotaExceeded" });
    });
});

describe("voiceThreadTransport", () => {
    it("keeps the transcript when an ok reply landed no turn", async () => {
        reply.mockResolvedValue({ order: null, status: "ok", transcript: "coffee five dollars" });

        await expect(Effect.runPromise(voiceThreadTransport().speak(SPEAK))).resolves.toStrictEqual({
            ok: false,
            reason: "invalidResponse",
            transcript: "coffee five dollars",
        });
    });
});

describe("enrichmentTransport", () => {
    it("fails with a CloudError when the suggestion does not match the spec", async () => {
        setCloudAuthenticated(true);
        reply.mockResolvedValue({ categoryName: "Groceries", domain: null });
        const suggest = enrichmentTransport();
        if (suggest === null) {
            throw new Error("expected a transport once authenticated");
        }

        const failure = await Effect.runPromise(
            suggest({ categoryTree: [], groundedLookup: false, income: false, name: "Lidl" }).pipe(Effect.flip)
        );

        expect(failure).toMatchObject({ _tag: "CloudError", kind: "action", path: "enrichment:suggest" });
    });
});
