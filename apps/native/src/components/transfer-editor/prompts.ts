import { formatAmount } from "@/domain/money";
import { formatRateFigure, quotePairRate } from "@/domain/transaction-entry-rate";
import { quotedByBcv, rateDeltaLine } from "@/domain/transaction-form-labels";
import type { FeeSide } from "@/domain/transfer-reconcile";
import type { useTranslation } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

import type { useTransferDraft } from "./use-transfer-draft";

export interface TransferGapAction {
    /** Set when resolving leaves the arrival pad showing a figure the sentence no longer asks for. */
    hidesArrival: boolean;
    label: string;
    onPress: () => void;
}

export interface TransferGapPrompt {
    actions: TransferGapAction[];
    message: string;
}

type Draft = ReturnType<typeof useTransferDraft>;
type Translate = ReturnType<typeof useTranslation>;

export function formatRate(draft: Pick<Draft, "rateInverse">, rate: number | null, language: Language): string | null {
    return rate === null ? null : formatRateFigure(quotePairRate(draft.rateInverse, rate), language);
}

export function rateDeltaNote(draft: Draft, t: Translate, language: Language): string | null {
    const { official } = draft.marketRates;
    const rate = draft.quotedRate;
    if (rate === null || official === null) {
        return null;
    }
    const moved = draft.paid - draft.fees.source;
    return rateDeltaLine(t, {
        bcv: quotedByBcv(draft.fromCurrency, draft.toCurrency),
        code: draft.toCurrency,
        difference: moved > 0 ? moved * (rate - official) : 0,
        language,
        percent: (quotePairRate(draft.rateInverse, rate) / quotePairRate(draft.rateInverse, official) - 1) * 100,
    });
}

export function blockMessage(draft: Draft, t: Translate, language: Language): string {
    if (draft.block === null || draft.block.kind === "rate") {
        return t("transfers.rate.unavailable");
    }
    const currency = draft.block.side === "destination" ? draft.toCurrency : draft.fromCurrency;
    return draft.block.shortfall > 0
        ? t("transfers.block.feeOverArrival", {
              amount: formatAmount(draft.block.shortfall, currency, true, language),
          })
        : t("transfers.block.nothingArrives");
}

// No resolution to offer: no fee or rate the screen could invent gives a blocked transfer legs.
export function blockPrompt(draft: Draft, t: Translate, language: Language): TransferGapPrompt | null {
    if (draft.block === null) {
        return null;
    }
    return { actions: [], message: blockMessage(draft, t, language) };
}

export function gapPrompt(draft: Draft, t: Translate, language: Language): TransferGapPrompt | null {
    const gap = draft.gapAmount;
    if (gap === 0 || draft.outside > 0) {
        return null;
    }
    const ends = { destination: draft.to, source: draft.from };
    // The side still charging nothing leads: a second bank's cut is likelier than the first one charging twice.
    const order: FeeSide[] =
        draft.fees.source > 0 && draft.fees.destination <= 0 ? ["destination", "source"] : ["source", "destination"];
    const fees = order.flatMap((side) =>
        gap > 0 && draft.gapFees[side] !== null
            ? [
                  {
                      hidesArrival: false,
                      label: t("transfers.gap.chargedBy", {
                          account: ends[side]?.name ?? t("transfers.sentence.blank.account"),
                      }),
                      onPress: () => draft.resolveAsFee(side),
                  },
              ]
            : []
    );
    const outside =
        gap < 0 && draft.crossCurrency
            ? [{ hidesArrival: false, label: t("transfers.gap.outside"), onPress: () => draft.setOutside(true) }]
            : [];
    const onTop = draft.gapOnTop
        ? [{ hidesArrival: !draft.crossCurrency, label: t("transfers.gap.itsOnTop"), onPress: draft.resolveAsOnTop }]
        : [];
    return {
        actions: [...fees, ...outside, ...onTop],
        message: t(gap < 0 ? "transfers.gap.more" : "transfers.gap.less", {
            amount: formatAmount(Math.abs(gap), draft.fromCurrency, true, language),
        }),
    };
}
