import { formatAmount } from "@/domain/money";
import { formatRateFigure, quotePairRate } from "@/domain/transaction-entry-rate";
import { quotedByBcv, rateDeltaLine } from "@/domain/transaction-form-labels";
import type { useTranslation } from "@/i18n/context";
import type { Language } from "@/i18n/languages";

import type { useTransferDraft } from "./use-transfer-draft";

export interface TransferGapPrompt {
    feeLabel: string | null;
    message: string;
    onFee: (() => void) | null;
    onOutside: (() => void) | null;
    onTop: (() => void) | null;
    outsideLabel: string | null;
    topLabel: string | null;
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
    const moved = draft.paid - (draft.feeSide === "source" ? draft.fee : 0);
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
    return draft.block.shortfall > 0
        ? t("transfers.block.feeOverArrival", {
              amount: formatAmount(draft.block.shortfall, draft.feeCurrency, true, language),
          })
        : t("transfers.block.nothingArrives");
}

// No resolution to offer: no fee or rate the screen could invent gives a blocked transfer legs.
export function blockPrompt(draft: Draft, t: Translate, language: Language): TransferGapPrompt | null {
    if (draft.block === null) {
        return null;
    }
    return {
        feeLabel: null,
        message: blockMessage(draft, t, language),
        onFee: null,
        onOutside: null,
        onTop: null,
        outsideLabel: null,
        topLabel: null,
    };
}

export function gapPrompt(draft: Draft, t: Translate, language: Language): TransferGapPrompt | null {
    const gap = draft.gapAmount;
    if (gap === 0 || draft.outside > 0) {
        return null;
    }
    const offersFee = gap > 0 && draft.gapFee !== null;
    const offersOutside = gap < 0 && draft.crossCurrency;
    return {
        feeLabel: offersFee ? t("transfers.gap.itsAFee") : null,
        message: t(gap < 0 ? "transfers.gap.more" : "transfers.gap.less", {
            amount: formatAmount(Math.abs(gap), draft.feeCurrency, true, language),
        }),
        onFee: offersFee ? draft.resolveAsFee : null,
        onOutside: offersOutside ? () => draft.setOutside(true) : null,
        onTop: draft.gapOnTop ? draft.resolveAsOnTop : null,
        outsideLabel: offersOutside ? t("transfers.gap.outside") : null,
        topLabel: draft.gapOnTop ? t("transfers.gap.itsOnTop") : null,
    };
}
