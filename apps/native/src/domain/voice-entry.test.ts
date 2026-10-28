import { describe, expect, it } from "vite-plus/test";

import {
    stillCurrent,
    transferStillCurrent,
    judgeSilence,
    localIsoDate,
    MAX_RECORDING_MS,
    meterToLevel,
    NO_SPEECH_TIMEOUT_MS,
    draftDelta,
    heardSegments,
    proposedDraftOf,
    resolveVoiceDraft,
    savableEntry,
    savableTransfer,
    spokenDateToLocal,
    startSilenceWatch,
    voiceTurnsOf,
    TRAILING_SILENCE_MS,
} from "./voice-entry";

const NOW = new Date(2026, 8, 3, 14, 30, 0);

const DRAFT = {
    accountName: "amex",
    amount: 12.5,
    categoryName: "coffee",
    currency: null,
    date: "2026-09-02",
    details: null,
    domain: "starbucks.com",
    income: false,
    kind: "entry" as const,
    merchant: "Starbucks",
    recurrence: null,
};

const TRANSFER = {
    amount: 500,
    currency: null,
    date: "2026-09-03",
    details: null,
    fromAccountName: "checking",
    kind: "transfer" as const,
    toAccountName: "Savings",
};

const CATEGORIES = [
    { id: "cat-coffee", income: false, name: "Coffee" },
    { id: "cat-salary", income: true, name: "Salary" },
    { id: "cat-refund", income: true, name: "Coffee" },
];

const ACCOUNTS = [
    { currency: "USD", id: "acc-amex", name: "Amex" },
    { currency: "USD", id: "acc-check", name: "Checking" },
    { currency: "EUR", id: "acc-eur", name: "Savings" },
];

const resolve = (draft: Parameters<typeof resolveVoiceDraft>[0]["draft"]) =>
    resolveVoiceDraft({ accounts: ACCOUNTS, categories: CATEGORIES, currency: "USD", draft, now: NOW });

describe("resolveVoiceDraft", () => {
    it("maps folded names onto ids, on the side of the ledger the draft is on", () => {
        const resolved = resolveVoiceDraft({
            accounts: ACCOUNTS,
            categories: CATEGORIES,
            currency: "USD",
            draft: DRAFT,
            now: NOW,
        });
        expect(resolved).toMatchObject({
            accountId: "acc-amex",
            categoryId: "cat-coffee",
            currency: "USD",
            date: new Date(2026, 8, 2, 12, 0, 0, 0),
            kind: "entry",
            recurrence: null,
        });
    });

    it("rounds the amount to the currency's minor units, on both kinds", () => {
        expect(resolve({ ...DRAFT, amount: 12.505 })).toMatchObject({ amount: 12.5 });
        expect(resolve({ ...DRAFT, amount: 100.6, currency: "JPY" })).toMatchObject({ amount: 101, currency: "JPY" });
        expect(resolve({ ...TRANSFER, amount: 500.004, toAccountName: "Amex" })).toMatchObject({ amount: 500 });
    });

    it("a spoken cadence becomes the stored recurring type and its multiplier", () => {
        const resolved = resolve({ ...DRAFT, recurrence: { every: 2, unit: "week" } });
        expect(resolved).toMatchObject({ recurrence: { coefficient: 2, type: 2 } });
    });

    it("an income draft matches the income category of the same name, never the expense one", () => {
        const resolved = resolveVoiceDraft({
            accounts: ACCOUNTS,
            categories: CATEGORIES,
            currency: "USD",
            draft: { ...DRAFT, income: true },
            now: NOW,
        });
        expect(resolved).toMatchObject({ categoryId: "cat-refund" });
    });

    it("unknown names and a spoken currency come through as null and as given", () => {
        const resolved = resolveVoiceDraft({
            accounts: ACCOUNTS,
            categories: CATEGORIES,
            currency: "USD",
            draft: { ...DRAFT, accountName: "Visa", categoryName: "Toys", currency: "EUR" },
            now: NOW,
        });
        expect(resolved).toMatchObject({ accountId: null, categoryId: null, currency: "EUR" });
    });

    it("a name two accounts or two categories share matches neither", () => {
        const doubled = resolveVoiceDraft({
            accounts: [...ACCOUNTS, { currency: "USD", id: "acc-amex-2", name: "AMEX" }],
            categories: [...CATEGORIES, { id: "cat-coffee-2", income: false, name: "coffee" }],
            currency: "USD",
            draft: DRAFT,
            now: NOW,
        });
        expect(doubled).toMatchObject({ accountId: null, accountUnresolved: true, categoryId: null });
    });

    it("an account named but not placed keeps a categorised draft out of direct save", () => {
        const doubledAccount = resolveVoiceDraft({
            accounts: [...ACCOUNTS, { currency: "USD", id: "acc-amex-2", name: "AMEX" }],
            categories: CATEGORIES,
            currency: "USD",
            draft: DRAFT,
            now: NOW,
        });
        const unnamedAccount = resolve({ ...DRAFT, accountName: null });
        if (doubledAccount.kind !== "entry" || unnamedAccount.kind !== "entry") {
            throw new Error("Expected entry drafts");
        }
        expect(doubledAccount).toMatchObject({ accountUnresolved: true, categoryId: "cat-coffee" });
        expect(savableEntry(doubledAccount)).toBeNull();
        expect(unnamedAccount).toMatchObject({ accountId: null, accountUnresolved: false });
        expect(savableEntry(unnamedAccount)).toStrictEqual({ categoryId: "cat-coffee" });
    });

    it("a transfer resolves both accounts and takes the leaving account's currency when none was said", () => {
        const resolved = resolve({ ...TRANSFER, fromAccountName: "Savings", toAccountName: "Amex" });
        expect(resolved).toMatchObject({
            currency: "EUR",
            fromAccount: { id: "acc-eur" },
            kind: "transfer",
            toAccount: { id: "acc-amex" },
        });
    });

    it("a transfer naming one account twice keeps only the source, and marks the destination unresolved", () => {
        const resolved = resolve({ ...TRANSFER, toAccountName: "Checking" });
        expect(resolved).toMatchObject({ fromAccount: { id: "acc-check" }, toAccount: null, toUnresolved: true });
    });

    it("a transfer leg named but not placed is flagged; an unnamed leg is not", () => {
        expect(resolve({ ...TRANSFER, fromAccountName: "Visa" })).toMatchObject({
            fromAccount: null,
            fromUnresolved: true,
            toUnresolved: false,
        });
        expect(resolve({ ...TRANSFER, toAccountName: null })).toMatchObject({ toAccount: null, toUnresolved: false });
        expect(
            resolveVoiceDraft({
                accounts: ACCOUNTS,
                accountsOmitted: true,
                categories: CATEGORIES,
                currency: "USD",
                draft: { ...TRANSFER, toAccountName: null },
                now: NOW,
            })
        ).toMatchObject({ toAccount: null, toUnresolved: true });
    });
});

describe("savableEntry", () => {
    it("needs a resolved category, an amount that survived rounding, and a merchant", () => {
        const whole = resolve(DRAFT);
        const dust = resolve({ ...DRAFT, amount: 0.001 });
        const uncategorised = resolve({ ...DRAFT, categoryName: "Toys" });
        if (whole.kind !== "entry" || dust.kind !== "entry" || uncategorised.kind !== "entry") {
            throw new Error("Expected entry drafts");
        }
        const nameless = resolve({ ...DRAFT, merchant: "  " });
        if (nameless.kind !== "entry") {
            throw new Error("Expected an entry draft");
        }
        expect(savableEntry(whole)).toStrictEqual({ categoryId: "cat-coffee" });
        expect(savableEntry(dust)).toBeNull();
        expect(savableEntry(uncategorised)).toBeNull();
        expect(savableEntry(nameless)).toBeNull();
    });
});

describe("savableTransfer", () => {
    it("needs both accounts in the amount's currency; a cross-currency move goes to the editor", () => {
        const same = resolve({ ...TRANSFER, toAccountName: "Amex" });
        const cross = resolve(TRANSFER);
        const missing = resolve({ ...TRANSFER, toAccountName: "Visa" });
        const dust = resolve({ ...TRANSFER, amount: 0.001, toAccountName: "Amex" });
        if (
            same.kind !== "transfer" ||
            cross.kind !== "transfer" ||
            missing.kind !== "transfer" ||
            dust.kind !== "transfer"
        ) {
            throw new Error("Expected transfer drafts");
        }
        expect(savableTransfer(same)).toMatchObject({ from: { id: "acc-check" }, to: { id: "acc-amex" } });
        expect(savableTransfer(cross)).toBeNull();
        expect(savableTransfer(missing)).toBeNull();
        expect(savableTransfer(dust)).toBeNull();
    });
});

describe("spokenDateToLocal", () => {
    it("today keeps the clock; another day lands at local noon; junk is now", () => {
        expect(spokenDateToLocal("2026-09-03", NOW)).toBe(NOW);
        expect(spokenDateToLocal("2026-08-30", NOW)).toStrictEqual(new Date(2026, 7, 30, 12));
        expect(spokenDateToLocal("yesterday", NOW)).toBe(NOW);
    });

    it("localIsoDate is the device calendar, zero-padded", () => {
        expect(localIsoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    });
});

describe("meterToLevel", () => {
    it("maps the speech band onto 0–1 and clamps the rest", () => {
        expect(meterToLevel(undefined)).toBe(0);
        expect(meterToLevel(-160)).toBe(0);
        expect(meterToLevel(-45)).toBe(0);
        expect(meterToLevel(-8)).toBe(1);
        expect(meterToLevel(0)).toBe(1);
        expect(meterToLevel(-26.5)).toBeCloseTo(0.5);
    });
});

describe("judgeSilence", () => {
    const TICK_MS = 50;

    function play(stretches: [number, number][]) {
        let judged = { verdict: "keep", watch: startSilenceWatch(0) };
        let at = 0;
        for (const [level, ms] of stretches) {
            for (const end = at + ms; at < end && judged.verdict === "keep";) {
                at += TICK_MS;
                judged = judgeSilence(judged.watch, level, at);
            }
        }
        return { at, verdict: judged.verdict };
    }

    function words(level: number, dip: number, ms: number): [number, number][] {
        return Array.from({ length: Math.round(ms / 350) }, () => [
            [level, 250],
            [dip, 100],
        ]).flat() as [number, number][];
    }

    it("a soft voice in a quiet room is speech, and the pause after it ends the entry", () => {
        const take = play([[0, 1000], ...words(0.16, 0.02, 2100), [0, 10_000]]);
        expect(take.verdict).toBe("finished");
        expect(take.at).toBe(3000 + TRAILING_SILENCE_MS);
    });

    it("a steady café is the room, not a voice; a voice over it keeps the take open until it stops", () => {
        expect(play([[0.35, MAX_RECORDING_MS]])).toStrictEqual({ at: NO_SPEECH_TIMEOUT_MS, verdict: "nothingSaid" });

        const talking = play([[0.35, 1000], ...words(0.75, 0.38, 6300), [0.35, MAX_RECORDING_MS]]);
        expect(talking).toStrictEqual({ at: 7200 + TRAILING_SILENCE_MS, verdict: "finished" });
    });

    it("a murmur that never reads as speech is sent at the timeout; a lone bump is not", () => {
        const murmur: [number, number][] = Array.from({ length: 10 }, (_, i) => [i % 2 === 0 ? 0 : 0.09, 500]);
        expect(play([...murmur, [0, NO_SPEECH_TIMEOUT_MS]])).toStrictEqual({
            at: NO_SPEECH_TIMEOUT_MS,
            verdict: "finished",
        });
        expect(
            play([
                [0, 1000],
                [0.09, 100],
                [0, NO_SPEECH_TIMEOUT_MS],
            ])
        ).toStrictEqual({ at: NO_SPEECH_TIMEOUT_MS, verdict: "nothingSaid" });
    });

    it("the hard cap ends a monologue", () => {
        const syllables: [number, number][] = Array.from({ length: MAX_RECORDING_MS / 300 }, (_, i) => [
            i % 2 === 0 ? 0.7 : 0.05,
            300,
        ]);
        expect(play(syllables)).toStrictEqual({ at: MAX_RECORDING_MS, verdict: "tooLong" });
    });
});

describe("heardSegments", () => {
    const sentence = "Gasté doce cincuenta en Starbucks ayer con la Visa";

    it("cuts the sentence around the quoted words, in reading order, whatever the case", () => {
        expect(
            heardSegments(sentence, [
                { field: "account", text: "la visa" },
                { field: "amount", text: "doce cincuenta" },
                { field: "merchant", text: "Starbucks" },
                { field: "date", text: "mañana" },
            ])
        ).toStrictEqual([
            { field: null, start: 0, text: "Gasté " },
            { field: "amount", start: 6, text: "doce cincuenta" },
            { field: null, start: 20, text: " en " },
            { field: "merchant", start: 24, text: "Starbucks" },
            { field: null, start: 33, text: " ayer con " },
            { field: "account", start: 43, text: "la Visa" },
        ]);
    });

    it("a phrase said twice lights the next free one instead of overlapping", () => {
        expect(
            heardSegments("diez y diez", [
                { field: "amount", text: "diez" },
                { field: "date", text: "diez" },
            ])
        ).toStrictEqual([
            { field: "amount", start: 0, text: "diez" },
            { field: null, start: 4, text: " y " },
            { field: "date", start: 7, text: "diez" },
        ]);
    });
});

describe("thread turns", () => {
    const said = { order: 1, parts: [{ type: "text" }], role: "user", status: "success", text: "twenty at netflix" };
    const answered = {
        order: 1,
        parts: [{ output: { draft: DRAFT }, state: "output-available", type: "tool-proposeDraft" }],
        role: "assistant",
        status: "success",
        text: "",
    };
    const pending = {
        order: 2,
        parts: [{ state: "input-streaming", type: "tool-proposeDraft" }],
        role: "assistant",
        status: "streaming",
        text: "",
    };

    it("reads the draft off the tool part once it has output, and nothing before", () => {
        expect(proposedDraftOf(answered)).toStrictEqual({ draft: DRAFT });
        expect(proposedDraftOf(pending)).toBeNull();
        expect(proposedDraftOf(said)).toBeNull();
    });

    it("the strip lists what was said and every answer that reached a draft", () => {
        expect(voiceTurnsOf([said, answered, { ...said, order: 2 }, pending])).toStrictEqual([
            { kind: "said", order: 1, text: "twenty at netflix" },
            { draft: DRAFT, kind: "proposed", order: 1 },
            { kind: "said", order: 2, text: "twenty at netflix" },
        ]);
    });

    it("draftDelta names the fields a correction moved, in names not ids", () => {
        expect(draftDelta(DRAFT, DRAFT)).toStrictEqual([]);
        expect(draftDelta(DRAFT, { ...DRAFT, categoryName: "Groceries", date: "2026-09-03" })).toStrictEqual([
            "date",
            "category",
        ]);
        expect(draftDelta(DRAFT, { ...DRAFT, amount: 15, income: true })).toStrictEqual(["amount", "category"]);
        expect(draftDelta(DRAFT, { ...DRAFT, recurrence: { every: 1, unit: "month" } })).toStrictEqual(["schedule"]);
        expect(draftDelta(DRAFT, { ...DRAFT, details: "for the office" })).toStrictEqual(["details"]);
        expect(draftDelta(DRAFT, TRANSFER)).toStrictEqual(["kind", "amount", "date"]);
        expect(draftDelta(TRANSFER, { ...TRANSFER, toAccountName: "Amex" })).toStrictEqual(["account"]);
    });
});

describe("stillCurrent", () => {
    it("is true only while every id the draft resolved to is still in the ledger", () => {
        const live = { accountIds: new Set(["acc-1"]), categoryIds: new Set(["cat-1"]) };
        expect(stillCurrent({ accountId: "acc-1", categoryId: "cat-1" }, live)).toBeTruthy();
        expect(stillCurrent({ accountId: null, categoryId: "cat-1" }, live)).toBeTruthy();
        expect(stillCurrent({ accountId: "acc-gone", categoryId: "cat-1" }, live)).toBeFalsy();
        expect(stillCurrent({ accountId: "acc-1", categoryId: "cat-gone" }, live)).toBeFalsy();
        expect(transferStillCurrent({ fromAccount: { id: "acc-1" }, toAccount: null }, live)).toBeTruthy();
        expect(transferStillCurrent({ fromAccount: { id: "acc-1" }, toAccount: { id: "acc-gone" } }, live)).toBeFalsy();
    });
});
