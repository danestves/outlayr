import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import type { ResolvedVoiceEntry } from "./voice-entry";
import { parseLiveDraft } from "./voice-live";
import { overlayLive, sentenceFromLive, sentenceFromResolved, withCorrection } from "./voice-sentence";

const NOW = new Date(2026, 10, 11, 9, 30);

const ACCOUNTS = [
    { currency: "USD", id: "banesco", name: "Banesco" },
    { currency: "USD", id: "visa", name: "Visa" },
];

const live = (text: string) =>
    sentenceFromLive(
        parseLiveDraft(
            text,
            { accounts: ACCOUNTS, categories: [], currency: "USD", language: "en", now: NOW },
            { final: true }
        )
    );

const ENTRY: ResolvedVoiceEntry = {
    accountId: "banesco",
    accountUnresolved: false,
    amount: 20,
    categoryId: "health",
    categoryUnresolved: false,
    currency: "USD",
    date: NOW,
    details: null,
    domain: null,
    income: false,
    kind: "entry",
    merchant: "Farmatodo",
    recurrence: null,
};

describe("sentenceFromLive", () => {
    it("reads a move as a transfer and a cadence as a subscription", () => {
        expect(live("I moved 50 from Banesco to Visa ").kind).toBe("transfer");
        expect(live("Netflix fifteen ninety-nine every month on my Visa ").kind).toBe("subscription");
    });

    it("keeps shape open until a word decides it", () => {
        expect(live("twenty dollars").kind).toBeNull();
    });

    it("marks every heard slot as guessed", () => {
        const heard = live("I moved 50 from Banesco to Visa ");
        expect([heard.amount?.mark, heard.from?.mark, heard.to?.mark]).toStrictEqual(["guessed", "guessed", "guessed"]);
    });
});

describe("sentenceFromResolved", () => {
    it("confirms what the draft resolved and leaves an empty merchant blank", () => {
        const sentence = sentenceFromResolved({ ...ENTRY, merchant: "  " });
        expect(sentence.amount).toStrictEqual({ mark: "confirmed", value: 20, was: null });
        expect(sentence.merchant).toBeNull();
        expect(sentence.kind).toBe("expense");
    });

    it("calls an entry with a recurrence a subscription", () => {
        const sentence = sentenceFromResolved({
            ...ENTRY,
            recurrence: { coefficient: 1, type: RECURRING_TYPE.monthly },
        });
        expect(sentence.kind).toBe("subscription");
    });
});

describe("corrections", () => {
    it("strikes only the slots that moved", () => {
        const before = sentenceFromResolved(ENTRY);
        const after = withCorrection(
            sentenceFromResolved({ ...ENTRY, amount: 25, date: new Date(2026, 10, 11, 18) }),
            before
        );
        expect(after.amount?.was).toBe(20);
        expect(after.date?.was).toBeNull();
        expect(after.merchant?.was).toBeNull();
    });

    it("lays a spoken fix over the earlier draft without blanking the rest", () => {
        const earlier = sentenceFromResolved(ENTRY);
        const fixed = overlayLive(earlier, live("no, it was 25 "));
        expect(fixed.amount).toStrictEqual({ mark: "guessed", value: 25, was: 20 });
        expect(fixed.merchant?.value).toBe("Farmatodo");
        expect(fixed.kind).toBe("expense");
    });
});
