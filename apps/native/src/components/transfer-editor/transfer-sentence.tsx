import { Sentence } from "@/components/sentence/sentence";
import { SentenceBlank } from "@/components/sentence/sentence-blank";
import { SentenceValue } from "@/components/sentence/sentence-value";
import type { SentenceFigure } from "@/components/sentence/sentence-value";
import { useTranslation } from "@/i18n/context";

export const TRANSFER_SENTENCE_SLOTS = [
    "amount",
    "arrivalFee",
    "arrivalFeeSide",
    "arrives",
    "fee",
    "feeSide",
    "from",
    "outside",
    "rate",
    "rateType",
    "to",
    "when",
] as const;

export type TransferSentenceSlot = (typeof TRANSFER_SENTENCE_SLOTS)[number];

export const TRANSFER_SENTENCE_KEYS = [
    "transfers.sentence.move",
    "transfers.sentence.rate",
    "transfers.sentence.fees",
    "transfers.sentence.noFee",
    "transfers.sentence.outside",
] as const;

export const TRANSFER_CUSTOM_RATE_KEY = "transfers.sentence.rateCustom";

export const TRANSFER_FEE_ARRIVAL_KEY = "transfers.sentence.feeArrives";

export const TRANSFER_FEE_ON_TOP_KEY = "transfers.sentence.feeOnTop";

export const TRANSFER_FEES_ARRIVAL_KEY = "transfers.sentence.feesArrive";

export type TransferSentenceValues = Readonly<Record<TransferSentenceSlot, string | null>>;

interface TransferSentenceProps {
    activeSlot: TransferSentenceSlot | null;
    /** Both sides charge: the sender's fee reads first, the receiver's as `arrivalFee`. */
    bothFees: boolean;
    crossCurrency: boolean;
    customRate: boolean;
    figures: Partial<Record<TransferSentenceSlot, SentenceFigure>>;
    flaggedSlot: TransferSentenceSlot | null;
    hasFee: boolean;
    onSlotPress: (slot: TransferSentenceSlot) => void;
    onTop: boolean;
    outside: boolean;
    values: TransferSentenceValues;
}

export function TransferSentence({
    activeSlot,
    bothFees,
    crossCurrency,
    customRate,
    figures,
    flaggedSlot,
    hasFee,
    onSlotPress,
    onTop,
    outside,
    values,
}: TransferSentenceProps) {
    const t = useTranslation();

    // Two fees would both read "Fee" to VoiceOver; naming the bank tells them apart.
    const feeOf = (account: string | null) =>
        bothFees && account !== null ? t("transfers.field.feeAt", { account }) : t("transfers.field.fee");
    const labels = {
        amount: t("transfers.field.sent"),
        arrivalFee: feeOf(values.arrivalFeeSide),
        arrivalFeeSide: t("transfers.field.feeSide"),
        arrives: t("transfers.field.arrives"),
        fee: feeOf(values.feeSide),
        feeSide: t("transfers.field.feeSide"),
        from: t("transfers.field.from"),
        outside: t("transfers.field.outside"),
        rate: t("transfers.field.rate"),
        rateType: t("transfers.field.rateType"),
        to: t("transfers.field.to"),
        when: t("transfers.field.date"),
    } satisfies Record<TransferSentenceSlot, string>;

    const blanks = {
        amount: t("transfers.sentence.blank.amount"),
        arrivalFee: t("transfers.sentence.blank.amount"),
        arrivalFeeSide: t("transfers.sentence.blank.account"),
        arrives: t("transfers.sentence.blank.amount"),
        fee: t("transfers.sentence.blank.noFee"),
        feeSide: t("transfers.sentence.blank.account"),
        from: t("transfers.sentence.blank.account"),
        outside: t("transfers.sentence.blank.amount"),
        rate: t("transfers.sentence.blank.rate"),
        rateType: t("transfers.sentence.blank.rate"),
        to: t("transfers.sentence.blank.account"),
        when: t("transfers.field.date"),
    } satisfies Record<TransferSentenceSlot, string>;

    const part = (slot: TransferSentenceSlot) => {
        const value = values[slot];
        const shared = {
            accessibilityLabel: labels[slot],
            active: activeSlot === slot,
            flagged: flaggedSlot === slot,
            onPress: () => onSlotPress(slot),
            shake: flaggedSlot === slot,
        };
        return value === null ? (
            <SentenceBlank
                {...shared}
                label={blanks[slot]}
                optional={slot === "fee"}
                optionalHint={t("transaction.sentence.optional")}
            />
        ) : (
            <SentenceValue {...shared} figure={figures[slot]} swapKey={slot} value={value} />
        );
    };

    const rateClause = customRate ? t(TRANSFER_CUSTOM_RATE_KEY) : t("transfers.sentence.rate");
    const singleClause = crossCurrency ? t("transfers.sentence.fee") : t(TRANSFER_FEE_ARRIVAL_KEY);
    const bothClause = crossCurrency ? t("transfers.sentence.fees") : t(TRANSFER_FEES_ARRIVAL_KEY);
    const included = bothFees ? bothClause : singleClause;
    const feeClause = onTop && !bothFees ? t(TRANSFER_FEE_ON_TOP_KEY) : included;
    const template = [
        t("transfers.sentence.move"),
        crossCurrency ? rateClause : null,
        hasFee ? feeClause : t("transfers.sentence.noFee"),
        outside ? t("transfers.sentence.outside") : null,
    ]
        .filter((clause) => clause !== null)
        .join(" ");

    return (
        <Sentence
            slots={{
                amount: part("amount"),
                arrivalFee: part("arrivalFee"),
                arrivalFeeSide: part("arrivalFeeSide"),
                arrives: part("arrives"),
                fee: part("fee"),
                feeSide: part("feeSide"),
                from: part("from"),
                outside: part("outside"),
                rate: part("rate"),
                rateType: part("rateType"),
                to: part("to"),
                when: part("when"),
            }}
            template={template}
        />
    );
}
