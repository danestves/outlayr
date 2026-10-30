import type { EntryRateType } from "@outlayr/money/rates";
import { useRef, useState } from "react";

import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useRatesRead } from "@/data/live-query";
import { transactionRateSuggestions } from "@/data/transaction-entry-rates";
import type { Transaction } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { formatSentenceDate } from "@/domain/dates";
import { formatAmount, minorUnitsFor, numberLocale } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import { rateAge } from "@/domain/rate-age";
import type { RateAge } from "@/domain/rate-age";
import {
    effectiveEntryRate,
    formatQuotedRateFigure,
    pairUnitSymbols,
    RATE_ENTRY_DECIMALS,
    rateDeltaPercent,
    transactionRateError,
    transactionRateOptions,
} from "@/domain/transaction-entry-rate";
import { quotedByBcv, rateDeltaLine, rateNameKey, rateSourceWordKey } from "@/domain/transaction-form-labels";
import { useLanguage, useTranslation } from "@/i18n/context";

import { AmountNumpad } from "../amount-numpad";
import { isProviderRate, NO_RATE, rateAfter, rateSelectionOf } from "./entry-rate";
import type { RateAction, RateEntry, RateSnapshot } from "./entry-rate";
import type { EntryForm } from "./form-values";
import type { TransactionRateClause } from "./sentence/transaction-sentence";
import type { StageNavigation, StageStepContent } from "./stage/stage-steps";
import { StepRate, StepRateField } from "./stage/step-rate";
import type { StepRateOption } from "./stage/step-rate";

interface EntryRateOptions {
    currency: string;
    date: Date;
    db: Database;
    exchangeRateType: EntryRateType | null;
    flagRate: (announce: boolean) => void;
    form: EntryForm;
    initial: Transaction | undefined;
    mode: "create" | "edit";
    rateEntry: RateEntry;
    rateShake: boolean;
    stage: StageNavigation;
}

export function useEntryRate({
    currency,
    date,
    db,
    exchangeRateType,
    flagRate,
    form,
    initial,
    mode,
    rateEntry,
    rateShake,
    stage,
}: EntryRateOptions) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;

    const rateFromSuggestion = useRef(isProviderRate(initial?.exchangeRate, exchangeRateType));
    const apply = (action: RateAction) => {
        const patch = rateAfter(
            { entry: form.state.values.rateEntry, fromSuggestion: rateFromSuggestion.current, type: exchangeRateType },
            currency,
            action
        );
        rateFromSuggestion.current = patch.fromSuggestion;
        if (patch.type !== undefined) {
            form.setFieldValue("exchangeRateType", patch.type);
        }
        if (patch.entry !== undefined) {
            form.setFieldValue("rateEntry", patch.entry);
        }
    };
    const leaveRateStep = () => {
        if (stage.step === "rate" || stage.step === "rateCustom" || stage.step === "rateUsd") {
            stage.leave("amount");
        }
    };

    const handleRateTypeChange = (next: EntryRateType) => {
        apply({ kind: "type", type: next });
        leaveRateStep();
    };

    const handleRateSuggestion = (rate: number, type: EntryRateType) => {
        apply({ kind: "suggestion", rate, type });
        leaveRateStep();
    };

    const handleCurrencyChange = (next: string) => {
        form.setFieldValue("txCurrency", next);
        apply({ kind: "currency", next });
        if (next === "USD") {
            leaveRateStep();
        }
    };

    const handleDateChange = (next: Date) => {
        apply({ kind: "date", moved: next.getTime() !== date.getTime() });
        form.setFieldValue("date", next);
    };

    const openCustomRate = (prior: number | null) => {
        apply({ kind: "custom", prior });
        stage.enter("rateCustom");
    };

    const snapshotRate = (entry: RateEntry): RateSnapshot => ({
        entry,
        fromSuggestion: rateFromSuggestion.current,
        type: exchangeRateType,
    });

    const rateSuggestions = useRatesRead(() => transactionRateSuggestions(db, currency, date), [db, currency, date]);
    const rateSelection = rateSelectionOf(rateEntry, exchangeRateType, currency);
    const converts = transactionRateOptions(currency).length > 0;
    const rateInForce = effectiveEntryRate(rateSelection, rateSuggestions);
    const rateUnitLabel = t("transaction.rate.unit", pairUnitSymbols("USD", currency));
    const rateFigure = (rate: number) => formatQuotedRateFigure(currency, rate, language);

    const amountInUsd = (amount: number): number | null =>
        amount <= 0 || rateInForce === null || rateInForce <= 0 ? null : amount / rateInForce;

    const suggestionFor = (type: EntryRateType): number | null => {
        if (type === "custom") {
            return null;
        }
        return type === "official" ? rateSuggestions.official : rateSuggestions.eurReference;
    };

    const rateDeltaNote = (rate: number | null, amount: number): string | null => {
        const { official } = rateSuggestions;
        if (rate === null || official === null) {
            return null;
        }
        return rateDeltaLine(t, {
            bcv: quotedByBcv(currency),
            code: "USD",
            difference: amount > 0 ? amount / rate - amount / official : 0,
            language,
            percent: rateDeltaPercent(currency, rate, official),
        });
    };

    const [refusedCurrency, setRefusedCurrency] = useState<string | null>(null);
    const rateMissingAfterRefusal =
        refusedCurrency === currency && transactionRateError(currency, rateSelection) !== null;
    if (refusedCurrency !== null && !rateMissingAfterRefusal) {
        setRefusedCurrency(null);
    }
    const [usdText, setUsdText] = useState("");
    const usdSnapshot = useRef<RateSnapshot>({ entry: NO_RATE, fromSuggestion: false, type: null });

    const flagMissing = (announce = true) => {
        flagRate(announce);
        setRefusedCurrency(currency);
    };

    const rateAgeOf = (type: Exclude<EntryRateType, "custom">, offered: number | null): RateAge => {
        const official = type === "official";
        const suggested = offered === suggestionFor(type);
        const suggestedDate = official ? rateSuggestions.officialDate : rateSuggestions.eurReferenceDate;
        return rateAge(t, {
            entryDate: date,
            fetchedAt: official ? rateSuggestions.officialFetchedAt : rateSuggestions.eurReferenceFetchedAt,
            language,
            now: new Date(),
            rateDate: suggested ? suggestedDate : null,
            use24Hour,
        });
    };
    const rateOptions = (): StepRateOption[] =>
        transactionRateOptions(currency).map((type) => {
            const shared = { name: t(rateNameKey(type, quotedByBcv(currency))), type, unit: rateUnitLabel };
            if (type === "custom") {
                const prior = rateSuggestions.priorCustom;
                const typed = rateSelection.exchangeRateType === "custom" ? rateInForce : null;
                return {
                    ...shared,
                    detail:
                        prior === null
                            ? t("transaction.rate.typeHint")
                            : t("transaction.rate.lastUsed", {
                                  date: formatSentenceDate(prior.date, language),
                                  rate: rateFigure(prior.rate),
                              }),
                    figure: typed === null ? null : rateFigure(typed),
                    placeholder: t("transaction.rate.type"),
                };
            }
            const offered =
                rateSelection.exchangeRateType === type && rateInForce !== null ? rateInForce : suggestionFor(type);
            return {
                ...shared,
                ...rateAgeOf(type, offered),
                figure: offered === null ? null : rateFigure(offered),
                placeholder: t("transaction.rate.unavailable"),
            };
        });
    const selectRateOption = (type: EntryRateType) => {
        if (type === "custom") {
            const hasCustom = rateSelection.exchangeRateType === "custom" && rateInForce !== null;
            openCustomRate(hasCustom ? null : (rateSuggestions.priorCustom?.rate ?? null));
            return;
        }
        const offered =
            rateSelection.exchangeRateType === type && rateInForce !== null ? rateInForce : suggestionFor(type);
        if (offered === null) {
            handleRateTypeChange(type);
            return;
        }
        handleRateSuggestion(offered, type);
    };
    const providerReferences = () =>
        transactionRateOptions(currency).flatMap((type) => {
            const offered = suggestionFor(type);
            return offered === null
                ? []
                : [
                      {
                          figure: rateFigure(offered),
                          label: t(rateNameKey(type, quotedByBcv(currency))),
                          onPress: () => handleRateSuggestion(offered, type),
                      },
                  ];
        });
    const customRateValue = (typing: boolean, typed: boolean): string => {
        if (typed) {
            return rateEntry.text.replace(".", numberLocale(language).decimal);
        }
        return rateInForce === null || typing ? t("transaction.rate.type") : rateFigure(rateInForce);
    };
    const openUsd = () => {
        usdSnapshot.current = snapshotRate(rateEntry);
        setUsdText("");
        stage.enter("rateUsd");
    };
    const typeUsd = (next: string, amountNumber: number) => {
        setUsdText(next);
        const usd = numpadToNumber(next);
        if (usd > 0 && amountNumber > 0) {
            apply({ kind: "derived", rate: amountNumber / usd });
            return;
        }
        apply({ kind: "restore", snapshot: usdSnapshot.current });
    };
    const rateClause = (amountNumber: number): TransactionRateClause => {
        const usd = amountInUsd(amountNumber);
        const type = rateSelection.exchangeRateType;
        const missing = rateInForce === null;
        let template = t("transaction.sentence.rate.provider");
        if (missing) {
            template = t("transaction.sentence.rate.missing");
        } else if (type === "custom") {
            template = t("transaction.sentence.rate.custom");
        }
        return {
            converted: usd === null ? null : { amount: usd, text: formatAmount(usd, "USD", true, language) },
            flagged: rateMissingAfterRefusal,
            missing,
            onConvertedPress: openUsd,
            onSourcePress: () => stage.enter("rate"),
            shake: rateShake,
            source: t(rateSourceWordKey(type, quotedByBcv(currency))),
            template,
        };
    };

    const steps = {
        rate: (): StageStepContent => ({
            body: (
                <StepRate
                    onSelect={selectRateOption}
                    options={rateOptions()}
                    selected={rateSelection.exchangeRateType}
                />
            ),
            footer: { label: t("common.done"), onPress: () => stage.leave("amount") },
            title: t("transaction.rate.title"),
        }),
        rateCustom: (amountNumber: number): StageStepContent => {
            const typing = rateSelection.exchangeRateType === "custom";
            const typed = typing && rateEntry.text !== "";
            return {
                body: (
                    <StepRateField
                        error={rateMissingAfterRefusal ? t("transaction.rate.required") : null}
                        note={typed ? rateDeltaNote(rateInForce, amountNumber) : null}
                        placeholder={!typed}
                        references={providerReferences()}
                        unit={rateUnitLabel}
                        value={customRateValue(typing, typed)}
                    >
                        <AmountNumpad
                            code={currency}
                            minorUnits={RATE_ENTRY_DECIMALS}
                            mode="explicitSeparator"
                            onChange={(next) => apply({ kind: "text", text: next })}
                            showDisplay={false}
                            value={typing ? rateEntry.text : ""}
                        />
                    </StepRateField>
                ),
                footer: {
                    label:
                        typed && rateInForce !== null
                            ? t("transaction.rate.use", { value: rateFigure(rateInForce) })
                            : t("common.done"),
                    onPress: () => {
                        if (typing && rateInForce === null) {
                            flagMissing();
                            return;
                        }
                        stage.leave("amount");
                    },
                },
                title: t("transaction.rate.custom"),
            };
        },
        rateUsd: (amountNumber: number): StageStepContent => {
            const usd = numpadToNumber(usdText);
            const derivedNote =
                usd > 0 && rateInForce !== null
                    ? [
                          t("transaction.rate.derived", { rate: `${rateFigure(rateInForce)} ${rateUnitLabel}` }),
                          rateDeltaNote(rateInForce, 0),
                      ]
                          .filter((line) => line !== null)
                          .join(" · ")
                    : null;
            return {
                body: (
                    <StepRateField
                        error={null}
                        figure={{ amount: usd, code: "USD" }}
                        note={derivedNote}
                        placeholder={usd <= 0}
                        value={formatAmount(usd > 0 ? usd : (amountInUsd(amountNumber) ?? 0), "USD", true, language)}
                    >
                        <AmountNumpad
                            code="USD"
                            minorUnits={minorUnitsFor("USD")}
                            onChange={(next) => typeUsd(next, amountNumber)}
                            showDisplay={false}
                            value={usdText}
                        />
                    </StepRateField>
                ),
                footer: {
                    label:
                        usd > 0
                            ? t("transaction.rate.use", { value: formatAmount(usd, "USD", true, language) })
                            : t("common.done"),
                    onPress: () => stage.leave("amount"),
                },
                title: t("transaction.rate.inDollars"),
            };
        },
    };

    return {
        amountInUsd,
        clause: (amountNumber: number) => (converts && amountNumber > 0 ? rateClause(amountNumber) : undefined),
        flagMissing,
        handleCurrencyChange,
        handleDateChange,
        inForce: rateInForce,
        line:
            mode === "edit" && converts && rateInForce !== null
                ? t("transaction.sentence.extra.rate", {
                      ...pairUnitSymbols("USD", currency),
                      rate: rateFigure(rateInForce),
                  })
                : null,
        selection: rateSelection,
        steps,
    };
}
