import { merchantKey } from "@outlayr/money/merchant-key";
import * as Effect from "effect/Effect";
import { useEffect, useRef, useState } from "react";

import { useAppSettings } from "@/contexts/display-settings-context";
import { useIdentityDraft, useIdentityReads } from "@/contexts/identity-draft-context";
import { getCategoryById } from "@/data/categories-core";
import type { CategoryWithChildren } from "@/data/categories-core";
import { recallMerchant } from "@/data/merchant-book-core";
import { rememberedCategoryFor } from "@/data/merchant-history-core";
import { remoteEnrichmentOn } from "@/data/settings-core";
import type { TagRow } from "@/data/tags-core";
import type { Database } from "@/db/client";
import { findTagByName } from "@/domain/tags";
import { useLocaleTag } from "@/hooks/use-locale-tag";
import { useRegionCode } from "@/hooks/use-region-code";
import { useTransactionEnrichment } from "@/hooks/use-transaction-enrichment";
import type { EnrichmentSuggestion } from "@/hooks/use-transaction-enrichment";
import { voidAppFlowCommand } from "@/state/entry-commands";
import { useAtomCommand } from "@/state/use-atom-command";

import { attachMerchantLogo, carryLookup } from "./entry-flows";
import type { EntryForm } from "./form-values";
import { carriedSlots, logoBlocked, replacesSlot, suggestionWrites } from "./merchant-lookup";
import type { FieldSource, LookupGuard, LookupSlot, LookupSources } from "./merchant-lookup";

const QUIET = { dontUpdateMeta: true };

interface MerchantLookupOptions {
    allTags: readonly TagRow[];
    categories: readonly CategoryWithChildren[];
    categoryChosen: boolean;
    currency: string;
    db: Database;
    form: EntryForm;
    globalCurrency: string;
    income: boolean;
    nameSeed: string;
    onCategoryFilled: () => void;
    restored: LookupSources | undefined;
    savedTagIds: readonly string[];
}

interface SavedEntry {
    income: boolean;
    merchant: string;
    txCurrency: string | null;
}

export function useMerchantLookup({
    allTags,
    categories,
    categoryChosen,
    currency,
    db,
    form,
    globalCurrency,
    income,
    nameSeed,
    onCategoryFilled,
    restored,
    savedTagIds,
}: MerchantLookupOptions) {
    const runFlow = useAtomCommand(voidAppFlowCommand);
    const { setDraft: setIdentity } = useIdentityDraft();
    const identityReads = useIdentityReads();
    const settings = useAppSettings().state;
    const remoteEnrichment = remoteEnrichmentOn(settings.bool);
    const groundedLookup = settings.bool("groundedLookup");
    const locale = useLocaleTag();
    const regionCode = useRegionCode();

    // A category carried in from `copyOf` is a choice, not a blank an enrichment suggestion may fill.
    const [categorySource, setCategorySource] = useState<FieldSource>(
        () => restored?.categorySource ?? (categoryChosen ? "user" : "initial")
    );
    const [tagsSource, setTagsSource] = useState<FieldSource>(restored?.tagsSource ?? "initial");
    const [identitySource, setIdentitySourceState] = useState<FieldSource>(restored?.identitySource ?? "initial");
    const identitySourceRef = useRef(identitySource);
    const setIdentitySource = (next: FieldSource) => {
        identitySourceRef.current = next;
        setIdentitySourceState(next);
    };

    // Carried to siblings only when this matches the screen: a save before the answer, or after an empty one, must not
    // hand the row's old category to rows that had none.
    const lookupAnsweredRef = useRef<{ currency: string | null; key: string } | null>(null);
    // The one place this ref is set: the compiler allows a captured ref to change inside one hook's callback, not two.
    const recordLookupAnswer = (answer: { currency: string | null; key: string } | null) => {
        lookupAnsweredRef.current = answer;
    };
    // A late answer may replace only slots left alone since the ask: a category picked meanwhile is newer.
    const touchedSinceLookupRef = useRef<Set<LookupSlot>>(new Set());
    const suggestedDomainRef = useRef<string | null>(null);
    const logoRequestRef = useRef(0);

    // Shape only: the names and what sits under what. No figures leave here.
    const categoryTree = categories.flatMap((parent) =>
        parent.name == null
            ? []
            : [
                  {
                      children: parent.children.map((child) => child.name).filter((name) => name != null),
                      name: parent.name,
                  },
              ]
    );

    const resolveLocal = (suggestion: EnrichmentSuggestion): EnrichmentSuggestion => {
        let { categoryId, pendingCategory: suggestedCategory } = suggestion;
        if (categoryId == null && suggestedCategory != null) {
            const matchedCategory = categories
                .flatMap((parent) => [parent, ...parent.children])
                .find((candidate) => candidate.name === suggestedCategory?.name);
            if (matchedCategory != null) {
                categoryId = matchedCategory.id;
                suggestedCategory = null;
            }
        }
        const resolvedTagIds: string[] = [...suggestion.tagIds];
        const pendingTagNames: string[] = [];
        for (const tagName of suggestion.pendingTagNames) {
            const matchedTag = findTagByName(allTags, tagName);
            if (matchedTag == null) {
                pendingTagNames.push(tagName);
            } else {
                resolvedTagIds.push(matchedTag.id);
            }
        }
        return {
            ...suggestion,
            categoryId,
            pendingCategory: suggestedCategory,
            pendingTagNames,
            tagIds: resolvedTagIds,
        };
    };

    const guard = (): LookupGuard => ({ asked: enrichment.userAsked(), touched: touchedSinceLookupRef.current });

    // A suggested logo stays replaceable so it follows the name; only a user choice or an open picker stops it. A run
    // that settles after a newer one started is dropped.
    const blocked = () => {
        const current = identityReads.draft();
        return logoBlocked(guard(), identitySourceRef.current, {
            held: Boolean(current.emoji || current.icon || current.photoUri),
            pickerOpen: identityReads.pickerOpen(),
        });
    };
    const dropSuggestedLogo = () => {
        if (identitySourceRef.current === "suggested") {
            setIdentitySource("initial");
            setIdentity((previous) => ({
                ...previous,
                photoColor: null,
                photoUri: null,
            }));
        }
    };
    const attachLogo = (domain: string | null) =>
        attachMerchantLogo(
            {
                apply: (photoUri, hue) => {
                    suggestedDomainRef.current = domain;
                    setIdentitySource("suggested");
                    const replacesChoice = replacesSlot(guard(), "identity");
                    setIdentity((previous) => ({
                        ...previous,
                        emoji: replacesChoice ? null : previous.emoji,
                        icon: replacesChoice ? null : previous.icon,
                        photoColor: hue,
                        photoUri,
                    }));
                },
                blocked,
                currentMerchant: () => form.state.values.merchant,
                dropSuggested: dropSuggestedLogo,
                forced: () => enrichment.userAsked(),
                isLatest: (ticket) => ticket === logoRequestRef.current,
                nextTicket: () => {
                    logoRequestRef.current += 1;
                    return logoRequestRef.current;
                },
            },
            domain
        );
    // oxlint-disable-next-line outlayr/react-effect-budget -- stops an in-flight logo fetch and file write from landing after the form unmounts
    useEffect(
        () => () => {
            logoRequestRef.current += 1;
        },
        [logoRequestRef]
    );

    // Its only consumer reads it through a committed snapshot, so its identity may change.
    const applySuggestion = (suggestion: EnrichmentSuggestion) => {
        // From the ref: the curated tier answers in the same tick the lookup is asked, before state commits.
        const asked = enrichment.userAsked();
        const answeredWithoutDomain =
            suggestion.categoryId != null ||
            suggestion.pendingCategory != null ||
            suggestion.tagIds.length > 0 ||
            suggestion.pendingTagNames.length > 0;
        const answer = { currency, key: merchantKey(form.state.values.merchant) };
        // A domain alone is an answer only once its logo is on the row, or the save would carry a logo this row lacks.
        if (asked && answeredWithoutDomain) {
            recordLookupAnswer(answer);
        }
        const writes = suggestionWrites(
            guard(),
            { categorySource, identitySource, tagsSource },
            savedTagIds.length,
            suggestion
        );
        if (writes.category === "fill" && suggestion.categoryId != null) {
            const matchedCategory = getCategoryById(db, suggestion.categoryId);
            if (matchedCategory != null) {
                form.setFieldValue("category", matchedCategory, QUIET);
                form.setFieldValue("pendingCategory", null, QUIET);
                onCategoryFilled();
                setCategorySource("suggested");
            }
        } else if (writes.category === "fill") {
            form.setFieldValue("category", null, QUIET);
            form.setFieldValue("pendingCategory", suggestion.pendingCategory, QUIET);
            onCategoryFilled();
            setCategorySource("suggested");
        } else if (writes.category === "clear") {
            form.setFieldValue("category", null, QUIET);
            form.setFieldValue("pendingCategory", null, QUIET);
            setCategorySource("initial");
        }
        if (writes.tags === "fill") {
            form.setFieldValue("tagIds", [...suggestion.tagIds], QUIET);
            form.setFieldValue("pendingTagNames", [...suggestion.pendingTagNames], QUIET);
            setTagsSource("suggested");
        } else if (writes.tags === "clear") {
            form.setFieldValue("tagIds", [], QUIET);
            form.setFieldValue("pendingTagNames", [], QUIET);
            setTagsSource("initial");
        }
        void runFlow(
            attachLogo(suggestion.domain).pipe(
                Effect.flatMap((landed) =>
                    Effect.sync(() => {
                        if (
                            landed &&
                            enrichment.userAsked() &&
                            merchantKey(form.state.values.merchant) === answer.key
                        ) {
                            recordLookupAnswer(answer);
                        }
                    })
                ),
                Effect.catchCause(() => Effect.void)
            )
        );
    };

    const enrichment = useTransactionEnrichment({
        categoryTree,
        currency,
        enabled: true,
        groundedLookup,
        income,
        initialName: nameSeed,
        locale,
        onSuggest: applySuggestion,
        recallMerchant: (name, forCurrency) => recallMerchant(db, name, forCurrency),
        regionCode,
        remoteEnabled: remoteEnrichment,
        resolveHistory: (key, forIncome) => rememberedCategoryFor(db, key, forIncome),
        resolveLocal,
    });

    const lookUp = () => {
        touchedSinceLookupRef.current.clear();
        // A new ask starts unanswered, so the previous answer cannot let a save carry.
        recordLookupAnswer(null);
        enrichment.lookupNow();
    };

    const claim = (slot: LookupSlot) => {
        if (slot === "category") {
            setCategorySource("user");
        } else if (slot === "tags") {
            setTagsSource("user");
        } else {
            setIdentitySource("user");
        }
        touchedSinceLookupRef.current.add(slot);
    };

    // Read back from the saved row: a pending category only gets an id at save. `forCurrency` is the row's own column
    // (null in the default currency), so siblings stored the same way match.
    const carry = (savedId: string, saved: SavedEntry, entryCurrency: string) => {
        const answered = lookupAnsweredRef.current;
        const carriesLookup =
            enrichment.userAsked() &&
            answered?.key === merchantKey(saved.merchant) &&
            answered.currency === entryCurrency;
        return carriesLookup
            ? carryLookup({
                  db,
                  forCurrency: saved.txCurrency,
                  forIncome: saved.income,
                  globalCurrency,
                  merchant: saved.merchant,
                  read: () =>
                      carriedSlots(guard(), { categorySource, identitySource, tagsSource }, suggestedDomainRef.current),
                  savedId,
              })
            : null;
    };

    return {
        carry,
        categoryPending: enrichment.pending && categorySource !== "user",
        claim,
        lookUp,
        onMerchantChange: enrichment.onNameChange,
        pending: enrichment.pending,
        queueable: (merchant: string) => remoteEnrichment && merchant.trim() !== "",
        releaseCategory: () => setCategorySource("initial"),
        sources: { categorySource, identitySource, tagsSource } satisfies LookupSources,
    };
}
