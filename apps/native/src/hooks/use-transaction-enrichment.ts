import { useCallback, useEffect, useRef, useState } from "react";

import { findCategoryPreset, presetForName } from "@/data/categories-core";
import { getCachedEnrichment, setCachedEnrichment } from "@/domain/enrichment-cache";
import type { RemoteEnrichmentResult } from "@/domain/enrichment-cache";
import { merchantKey, resolveMerchant } from "@/domain/merchant-resolver";
import type { MerchantMatch } from "@/domain/merchant-resolver";
import { translateNow } from "@/i18n/runtime";
import { enrichmentTransport } from "@/lib/convex";
import type { CategoryBranch, EnrichmentFn } from "@/lib/convex";
import { withTimeout } from "@/lib/with-timeout";

const noop = () => undefined;

export interface PendingCategory {
    color: string;
    emoji: string | null;
    icon: string;
    name: string;
    parentName: string | null;
}

export interface EnrichmentSuggestion {
    categoryId: string | null;
    domain: string | null;
    pendingCategory: PendingCategory | null;
    pendingTagNames: readonly string[];
    source: "curated" | "history" | "remote";
    tagIds: readonly string[];
}

const NOTHING: EnrichmentSuggestion = {
    categoryId: null,
    domain: null,
    pendingCategory: null,
    pendingTagNames: [],
    source: "curated",
    tagIds: [],
};

function withRemembered(suggestion: EnrichmentSuggestion, categoryId: string | null): EnrichmentSuggestion {
    if (categoryId == null) {
        return suggestion;
    }
    return { ...suggestion, categoryId, pendingCategory: null, source: "history" };
}

export interface UseTransactionEnrichmentArgs {
    categoryTree: readonly CategoryBranch[];
    currency?: string;
    enabled: boolean;
    /** The server re-checks the `groundedLookup` setting independently. */
    groundedLookup?: boolean;
    income: boolean;
    initialName?: string;
    locale?: string;
    onSuggest: (suggestion: EnrichmentSuggestion) => void;
    regionCode?: string;
    remoteEnabled?: boolean;
    resolveHistory?: (key: string, income: boolean) => Promise<string | null>;
    resolveLocal: (suggestion: EnrichmentSuggestion) => EnrichmentSuggestion;
    recallMerchant?: (name: string, currency: string | undefined) => Promise<RemoteEnrichmentResult | null>;
    resolveDomain?: (key: string) => string | null;
    transport?: EnrichmentFn | null;
}

export interface UseTransactionEnrichmentResult {
    lookupNow: () => Promise<void>;
    onNameChange: (next: string) => void;
    pending: boolean;
}

const DEBOUNCE_MS = 600;
// A grounded answer bills ~3 search calls, so it waits out mid-name pauses ("Rio" before "rio supermercado").
const GROUNDED_IDLE_MS = 1800;
const GROUNDED_RECHECK_MS = 8000;
const GROUNDED_RECHECK_RETRY_MS = 12_000;
const MIN_KEY_LENGTH = 3;
export const REMOTE_TIMEOUT_MS = 9000;

function toCuratedSuggestion(match: MerchantMatch): EnrichmentSuggestion {
    const preset = findCategoryPreset(match.categoryName);
    return {
        categoryId: null,
        domain: match.domain,
        pendingCategory: preset
            ? {
                  color: preset.color,
                  emoji: null,
                  icon: preset.icon,
                  name: match.categoryName,
                  parentName: null,
              }
            : null,
        pendingTagNames: match.tags.map((tag) => translateNow(`merchantTag.${tag}`)),
        source: "curated",
        tagIds: [],
    };
}

function toRemoteSuggestion(result: RemoteEnrichmentResult): EnrichmentSuggestion {
    const preset = result.categoryName == null ? null : presetForName(result.categoryName);
    return {
        categoryId: null,
        domain: result.domain,
        pendingCategory:
            result.categoryName == null || preset == null
                ? null
                : {
                      color: preset.color,
                      emoji: result.emoji ?? null,
                      icon: preset.icon,
                      name: result.categoryName,
                      parentName: result.parentCategoryName ?? null,
                  },
        pendingTagNames: result.tags,
        source: "remote",
        tagIds: [],
    };
}

export function useTransactionEnrichment(args: UseTransactionEnrichmentArgs): UseTransactionEnrichmentResult {
    const {
        enabled,
        income,
        initialName,
        categoryTree,
        currency,
        resolveLocal,
        resolveHistory,
        resolveDomain,
        recallMerchant,
        onSuggest,
        remoteEnabled = true,
        locale,
        regionCode,
        groundedLookup = true,
        transport,
    } = args;

    const [pending, setPending] = useState(false);
    const [forcing, setForcing] = useState(false);

    const nameRef = useRef(initialName ?? "");
    const forceRef = useRef(false);
    const forcingRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const groundedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const groundedFollowUpRef = useRef<() => void>(noop);
    const recheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearTimers = useCallback(() => {
        for (const ref of [timerRef, groundedTimerRef, recheckTimerRef]) {
            if (ref.current != null) {
                clearTimeout(ref.current);
                ref.current = null;
            }
        }
    }, []);
    const requestIdRef = useRef(0);
    // Ticketed, not a bare set: a superseded request still settles and must not delete an entry a LATER request owns.
    const inFlightRef = useRef<Map<string, number>>(new Map());
    const lastRemoteOutcomeRef = useRef<{
        key: string;
        hasDomain: boolean;
    } | null>(null);
    const curatedFallbackRef = useRef<{
        key: string;
        suggestion: EnrichmentSuggestion;
    } | null>(null);

    const rememberedRef = useRef<{ categoryId: string | null; key: string } | null>(null);
    const lastEmittedRef = useRef<{ key: string; suggestion: EnrichmentSuggestion } | null>(null);

    // Tiers read the latest arguments here: the timer and await chain outlives the render that started it.
    const resolved = {
        categoryTree,
        currency,
        enabled,
        groundedLookup,
        income,
        locale,
        onSuggest,
        recallMerchant,
        regionCode,
        remoteEnabled,
        resolveDomain,
        resolveHistory,
        resolveLocal,
        transport,
    };
    const latest = useRef(resolved);
    useEffect(() => {
        latest.current = resolved;
    });

    const rememberedNow = useCallback((): string | null => {
        const held = rememberedRef.current;
        if (held == null || held.key !== merchantKey(nameRef.current)) {
            return null;
        }
        return held.categoryId;
    }, []);

    const emit = useCallback(
        (suggestion: EnrichmentSuggestion) => {
            lastEmittedRef.current = { key: merchantKey(nameRef.current), suggestion };
            latest.current.onSuggest(latest.current.resolveLocal(withRemembered(suggestion, rememberedNow())));
        },
        [rememberedNow]
    );

    const emitNothing = useCallback(() => {
        emit(NOTHING);
    }, [emit]);

    const recallFromLedger = useCallback(async (key: string) => {
        const resolve = latest.current.resolveHistory;
        if (resolve == null) {
            rememberedRef.current = { categoryId: null, key };
            return;
        }
        const categoryId = await resolve(key, latest.current.income);
        if (merchantKey(nameRef.current) !== key) {
            return;
        }
        rememberedRef.current = { categoryId, key };
        if (categoryId == null) {
            return;
        }
        const last = lastEmittedRef.current;
        const base = last != null && last.key === key ? last.suggestion : NOTHING;
        latest.current.onSuggest(latest.current.resolveLocal(withRemembered(base, categoryId)));
    }, []);

    const resolveTransport = useCallback(
        () => (latest.current.transport === undefined ? enrichmentTransport() : latest.current.transport),
        []
    );

    const buildRequest = useCallback(
        (grounded: boolean) => ({
            categoryTree: latest.current.categoryTree.map((branch) => ({
                children: [...branch.children],
                name: branch.name,
            })),
            currency: latest.current.currency,
            groundedLookup: grounded,
            income: latest.current.income,
            locale: latest.current.locale,
            name: nameRef.current.trim(),
            regionCode: latest.current.regionCode,
        }),
        []
    );

    // `askedIn` is the request's currency, not the one on screen: filing under the screen's would cache the old
    // country's answer in the new partition.
    const emitDomainResult = useCallback(
        (key: string, result: RemoteEnrichmentResult | null, askedIn: string | undefined): boolean => {
            if (result?.domain == null || merchantKey(nameRef.current) !== key) {
                return false;
            }
            if (result.grounding !== true) {
                setCachedEnrichment(key, result, askedIn);
            }
            const fallback = curatedFallbackRef.current;
            if (fallback != null && fallback.key === key) {
                emit({ ...fallback.suggestion, domain: result.domain });
            } else {
                emit(toRemoteSuggestion(result));
            }
            return true;
        },
        [emit]
    );

    const emitRemoteResult = useCallback(
        (key: string, result: RemoteEnrichmentResult | null) => {
            const fallback = curatedFallbackRef.current;
            if (fallback != null && fallback.key === key) {
                if (result?.domain != null) {
                    emit({ ...fallback.suggestion, domain: result.domain });
                }
                return;
            }
            if (result == null) {
                emitNothing();
                return;
            }
            emit(toRemoteSuggestion(result));
        },
        [emit, emitNothing]
    );

    const runRemote = useCallback(
        async (key: string) => {
            const call = resolveTransport();
            if (call == null) {
                return;
            }
            requestIdRef.current += 1;
            const id = requestIdRef.current;
            inFlightRef.current.set(key, id);
            setPending(true);
            const request = buildRequest(false);
            let result: RemoteEnrichmentResult | null = null;
            try {
                result = await withTimeout(call(request), REMOTE_TIMEOUT_MS, null);
            } catch {
                result = null;
            }
            if (inFlightRef.current.get(key) === id) {
                inFlightRef.current.delete(key);
            }
            if (id !== requestIdRef.current) {
                return;
            }
            if (result?.grounding !== true) {
                setCachedEnrichment(key, result, request.currency);
            }
            if (merchantKey(nameRef.current) !== key) {
                setPending(false);
                return;
            }
            // Below the ticket check: a superseded request recording here would answer for a name the user has left,
            // wrongly suppressing or spending the grounded follow-up.
            lastRemoteOutcomeRef.current = { hasDomain: result?.domain != null, key };
            setPending(false);
            emitRemoteResult(key, result);
        },
        [emitRemoteResult, resolveTransport, buildRequest]
    );

    const runGroundedFollowUp = useCallback(async () => {
        // `remoteEnabled` too: a merchant the ledger already knew records an outcome, and its name must not leave here.
        if (!latest.current.groundedLookup || !latest.current.remoteEnabled) {
            return;
        }
        const key = merchantKey(nameRef.current);
        const outcome = lastRemoteOutcomeRef.current;
        if (outcome == null || outcome.key !== key) {
            if (inFlightRef.current.has(key)) {
                groundedTimerRef.current = setTimeout(() => groundedFollowUpRef.current(), GROUNDED_IDLE_MS);
            }
            return;
        }
        if (outcome.hasDomain) {
            return;
        }
        const call = resolveTransport();
        if (call == null) {
            return;
        }
        const ticket = requestIdRef.current;
        const request = buildRequest(true);
        const stale = () =>
            ticket !== requestIdRef.current ||
            merchantKey(nameRef.current) !== key ||
            latest.current.currency !== request.currency;
        let result: RemoteEnrichmentResult | null = null;
        try {
            result = await call(request);
        } catch {
            result = null;
        }
        if (stale()) {
            return;
        }
        if (emitDomainResult(key, result, request.currency) || result?.grounding !== true) {
            return;
        }
        const scheduleRecheck = (delay: number, retriesLeft: number) => {
            recheckTimerRef.current = setTimeout(async () => {
                let rechecked: RemoteEnrichmentResult | null = null;
                try {
                    rechecked = await call({
                        ...request,
                        groundedLookup: false,
                        knowledgeOnly: true,
                    });
                } catch {
                    rechecked = null;
                }
                if (stale() || emitDomainResult(key, rechecked, request.currency)) {
                    return;
                }
                if (retriesLeft > 0) {
                    scheduleRecheck(GROUNDED_RECHECK_RETRY_MS, retriesLeft - 1);
                }
            }, delay);
        };
        scheduleRecheck(GROUNDED_RECHECK_MS, 1);
    }, [resolveTransport, buildRequest, emitDomainResult]);

    // Every final answer `run` reaches without the model must supersede older requests, or one settling late emits
    // the PREVIOUS name's suggestion (in the account editor, the last merchant's logo).
    const supersedeInFlight = useCallback(() => {
        requestIdRef.current += 1;
        // Cleared with the ticket, or `run` refuses to restart a name whose abandoned call is still out. `runRemote`
        // bumps the ticket as it starts, so this never drops a live request.
        inFlightRef.current.clear();
        setPending(false);
    }, []);

    const run = useCallback(async () => {
        // Read first: every early return below is final, and a force left standing would skip the next lookup's cache.
        const force = forceRef.current;
        forceRef.current = false;
        const key = merchantKey(nameRef.current);
        if (key.length < MIN_KEY_LENGTH) {
            supersedeInFlight();
            rememberedRef.current = null;
            emitNothing();
            return;
        }
        if (force) {
            rememberedRef.current = { categoryId: null, key };
        } else {
            // oxlint-disable-next-line no-void -- not awaited: the curated tier below must stay synchronous.
            void recallFromLedger(key);
        }
        const match = resolveMerchant(key);
        let curatedFallback = false;
        if (match != null) {
            const curatedSuggestion = toCuratedSuggestion(match);
            emit(curatedSuggestion);
            if (match.domain != null) {
                supersedeInFlight();
                return;
            }
            curatedFallback = true;
            curatedFallbackRef.current = { key, suggestion: curatedSuggestion };
        }
        const localDomain = latest.current.resolveDomain?.(key) ?? null;
        if (localDomain != null) {
            const base = curatedFallback ? curatedFallbackRef.current?.suggestion : undefined;
            emit({ ...(base ?? NOTHING), domain: localDomain });
            supersedeInFlight();
            return;
        }
        const recalled = force
            ? null
            : ((await latest.current.recallMerchant?.(nameRef.current, latest.current.currency)) ?? null);
        if (merchantKey(nameRef.current) !== key) {
            return;
        }
        if (recalled != null) {
            lastRemoteOutcomeRef.current = { hasDomain: recalled.domain != null, key };
            emitRemoteResult(key, recalled);
            supersedeInFlight();
            return;
        }
        if (!latest.current.remoteEnabled) {
            if (!curatedFallback) {
                emitNothing();
            }
            supersedeInFlight();
            return;
        }
        const cached = force ? { hit: false as const } : getCachedEnrichment(key, latest.current.currency);
        if (cached.hit) {
            lastRemoteOutcomeRef.current = { hasDomain: cached.value?.domain != null, key };
            emitRemoteResult(key, cached.value);
            supersedeInFlight();
            return;
        }
        if (inFlightRef.current.has(key)) {
            if (!force) {
                return;
            }
            supersedeInFlight();
        }
        await runRemote(key);
    }, [emit, emitNothing, emitRemoteResult, recallFromLedger, runRemote, supersedeInFlight]);

    useEffect(() => {
        groundedFollowUpRef.current = runGroundedFollowUp;
    }, [runGroundedFollowUp]);

    const onNameChange = useCallback(
        (next: string) => {
            nameRef.current = next;
            if (!latest.current.enabled) {
                return;
            }
            clearTimers();
            timerRef.current = setTimeout(run, DEBOUNCE_MS);
            groundedTimerRef.current = setTimeout(runGroundedFollowUp, GROUNDED_IDLE_MS);
        },
        [clearTimers, run, runGroundedFollowUp]
    );

    const lookupNow = useCallback(async () => {
        if (!latest.current.enabled || forcingRef.current) {
            return;
        }
        forcingRef.current = true;
        setForcing(true);
        clearTimers();
        forceRef.current = true;
        await run()
            .then(() => runGroundedFollowUp())
            .finally(() => {
                forcingRef.current = false;
                setForcing(false);
            });
    }, [clearTimers, run, runGroundedFollowUp]);

    const cancel = useCallback(() => {
        clearTimers();
        requestIdRef.current += 1;
        inFlightRef.current.clear();
    }, [clearTimers]);

    if (!enabled && pending) {
        setPending(false);
    }

    useEffect(() => {
        if (!enabled) {
            cancel();
        }
    }, [enabled, cancel]);

    useEffect(() => () => cancel(), [cancel]);

    // The same name in another currency can be another business, and the backfill treats a saved logo as final,
    // so a currency change asks again.
    const seenCurrencyRef = useRef(currency);
    useEffect(() => {
        if (seenCurrencyRef.current === currency) {
            return;
        }
        seenCurrencyRef.current = currency;
        if (!latest.current.enabled) {
            return;
        }
        supersedeInFlight();
        lastRemoteOutcomeRef.current = null;
        const key = merchantKey(nameRef.current);
        if (key.length < MIN_KEY_LENGTH) {
            return;
        }
        const last = lastEmittedRef.current;
        if (last != null && last.key === key && last.suggestion.domain != null) {
            emit({ ...last.suggestion, domain: null });
        }
        onNameChange(nameRef.current);
    }, [currency, emit, onNameChange, supersedeInFlight]);

    const seenIncomeRef = useRef(income);
    useEffect(() => {
        if (seenIncomeRef.current === income) {
            return;
        }
        seenIncomeRef.current = income;
        if (!latest.current.enabled) {
            return;
        }
        supersedeInFlight();
        lastRemoteOutcomeRef.current = null;
        if (merchantKey(nameRef.current).length < MIN_KEY_LENGTH) {
            return;
        }
        onNameChange(nameRef.current);
    }, [income, onNameChange, supersedeInFlight]);

    return { lookupNow, onNameChange, pending: pending || forcing };
}
