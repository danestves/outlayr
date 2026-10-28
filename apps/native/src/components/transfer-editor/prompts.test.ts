import { describe, expect, it, vi } from "vite-plus/test";

import { blockMessage, gapPrompt } from "./prompts";

type Draft = Parameters<typeof blockMessage>[0];

const t = ((key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key) as Parameters<typeof blockMessage>[1];

function drafted(block: Draft["block"]): Draft {
    return { block, fromCurrency: "USD", toCurrency: "VES" } as Draft;
}

describe("what a blocked transfer says", () => {
    it("asks for a rate when no source quotes the pair", () => {
        expect(blockMessage(drafted({ kind: "rate" }), t, "en")).toBe("transfers.rate.unavailable");
    });

    it("names how far over the fee is, so the user knows what to change", () => {
        expect(blockMessage(drafted({ kind: "fee", shortfall: 45, side: "destination" }), t, "en")).toContain(
            "transfers.block.feeOverArrival"
        );
    });

    it("says nothing would arrive when the fee takes precisely all of it", () => {
        expect(blockMessage(drafted({ kind: "fee", shortfall: 0, side: "source" }), t, "en")).toBe(
            "transfers.block.nothingArrives"
        );
    });
});

function gapped(draft: Partial<Parameters<typeof gapPrompt>[0]>) {
    return gapPrompt(
        {
            crossCurrency: true,
            fees: { destination: 0, source: 0 },
            from: { name: "Payoneer" },
            fromCurrency: "USD",
            gapFees: { destination: null, source: null },
            gapOnTop: false,
            outside: 0,
            to: { name: "Mercantil" },
            ...draft,
        } as Parameters<typeof gapPrompt>[0],
        t,
        "en"
    );
}

describe("what an unexplained remainder offers", () => {
    it("reads dollars lost on the way as less arriving, with a fee and never a rate to explain it", () => {
        const prompt = gapped({ gapAmount: 7.34, gapFees: { destination: 7020.41, source: 7.34 } });

        expect(prompt?.message).toBe('transfers.gap.less:{"amount":"$7.34"}');
        expect(prompt?.actions.map((action) => action.label)).toStrictEqual([
            'transfers.gap.chargedBy:{"account":"Payoneer"}',
            'transfers.gap.chargedBy:{"account":"Mercantil"}',
        ]);
    });

    it("offers the bank that charged nothing yet before adding to the fee already typed", () => {
        const resolveAsFee = vi.fn();
        const prompt = gapped({
            crossCurrency: false,
            fees: { destination: 0, source: 15 },
            gapAmount: 16.05,
            gapFees: { destination: 16.05, source: 31.05 },
            resolveAsFee,
        });

        expect(prompt?.actions[0]?.label).toBe('transfers.gap.chargedBy:{"account":"Mercantil"}');
        prompt?.actions[0]?.onPress();
        expect(resolveAsFee).toHaveBeenCalledWith("destination");
    });

    it("reads more arriving than the typed rate converts as money from another account", () => {
        const setOutside = vi.fn();
        const prompt = gapped({ gapAmount: -4.53, setOutside });

        expect(prompt?.message).toBe('transfers.gap.more:{"amount":"$4.53"}');
        expect(prompt?.actions.map((action) => action.label)).toStrictEqual(["transfers.gap.outside"]);
        prompt?.actions[0]?.onPress();
        expect(setOutside).toHaveBeenCalledWith(true);
    });

    it("offers no fee for a surplus, where booking one would only shrink the fee typed", () => {
        const prompt = gapped({ gapAmount: -4.53, gapFees: { destination: null, source: 5.47 } });
        expect(prompt?.actions.map((action) => action.label)).toStrictEqual(["transfers.gap.outside"]);
    });

    it("offers no outside account between two accounts in one currency", () => {
        expect(gapped({ crossCurrency: false, gapAmount: -5 })?.actions).toStrictEqual([]);
    });

    it("goes quiet once the surplus is confirmed, because the sentence states it", () => {
        expect(gapped({ gapAmount: -4.53, outside: 4.53 })).toBeNull();
    });
});
