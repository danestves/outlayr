import type { InsightsMeasure } from "@/data/insights";
import type { TranslateFn } from "@/i18n/context";

import { measureRiseIsFavourable } from "./insights-measure";
import { formatAmount } from "./money";

const FLAT_BAND = 0.02;

const BADGE_PERCENT_CAP = 1000;

export interface VerdictInput {
    code: string;
    current: number;
    measure: InsightsMeasure;
    prior: number;
    priorLabel: string;
    showCents: boolean;
    t: TranslateFn;
    topMover: { name: string; delta: number } | null;
}

export interface Verdict {
    badge: string | null;
    favourable: boolean;
    sentence: string | null;
}

export function insightsVerdict(input: VerdictInput): Verdict {
    const { measure, current, prior, priorLabel, topMover, code, showCents, t } = input;

    if (prior === 0) {
        return { badge: null, favourable: true, sentence: null };
    }

    const delta = current - prior;
    const ratio = delta / Math.abs(prior);
    const favourable = measureRiseIsFavourable(measure) ? delta >= 0 : delta <= 0;

    const percent = Math.round(ratio * 100);
    const badge = Math.abs(percent) >= BADGE_PERCENT_CAP ? null : `${percent > 0 ? "+" : ""}${percent}%`;

    if (Math.abs(ratio) < FLAT_BAND) {
        return {
            badge,
            favourable: true,
            sentence: t("verdict.inLine", { prior: priorLabel }),
        };
    }

    let sentence = t(delta > 0 ? "verdict.moreThan" : "verdict.lessThan", {
        amount: formatAmount(Math.abs(delta), code, showCents),
        prior: priorLabel,
    });

    if (topMover) {
        sentence += ` ${t(topMover.delta > 0 ? "verdict.moverAdded" : "verdict.moverGaveBack", {
            amount: formatAmount(Math.abs(topMover.delta), code, showCents),
            name: topMover.name,
        })}`;
    }

    return { badge, favourable, sentence };
}
