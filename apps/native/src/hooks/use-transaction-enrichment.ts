import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { RefObject } from "react";

import { findCategoryPreset, presetForName } from "@/data/categories-core";
import { getCachedEnrichment, setCachedEnrichment } from "@/domain/enrichment-cache";
import type { RemoteEnrichmentResult } from "@/domain/enrichment-cache";
import { merchantKey, resolveMerchant } from "@/domain/merchant-resolver";
import type { MerchantMatch } from "@/domain/merchant-resolver";
import { translateNow } from "@/i18n/runtime";
import type { CloudError } from "@/lib/cloud-error";
import { enrichmentTransport } from "@/lib/convex";
import type { CategoryBranch, EnrichmentFn } from "@/lib/convex";
import { useLatest } from "@/lib/use-latest";
import { ENRICHMENT_TIMEOUT, timedCaptureCommand } from "@/state/capture-commands";
import { fromCommand, voidFlowCommand } from "@/state/entry-commands";
import { logged } from "@/state/entry-save";
import { useAtomCommand } from "@/state/use-atom-command";

const enrichCommand = timedCaptureCommand<RemoteEnrichmentResult | null>({
    operation: "enrich",
    timeout: ENRICHMENT_TIMEOUT,
});

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
    remoteEnabled: boolean;
    resolveHistory?: (key: string, income: boolean) => Effect.Effect<string | null, unknown>;
    resolveLocal: (suggestion: EnrichmentSuggestion) => EnrichmentSuggestion;
    recallMerchant?: (
        name: string,
        currency: string | undefined
    ) => Effect.Effect<RemoteEnrichmentResult | null, unknown>;
    resolveDomain?: (key: string) => string | null;
    transport?: EnrichmentFn | null;
}

export interface UseTransactionEnrichmentResult {
    lookupNow: () => void;
    onNameChange: (next: string) => void;
    pending: boolean;
}

const DEBOUNCE_MS = 600;
// A grounded answer bills ~3 search calls, so it waits out mid-name pauses ("Rio" before "rio supermercado").
const GROUNDED_IDLE_MS = 1800;
const GROUNDED_RECHECK_MS = 8000;
const GROUNDED_RECHECK_RETRY_MS = 12_000;
const MIN_KEY_LENGTH = 3;

const settledResult = (call: Effect.Effect<RemoteEnrichmentResult, CloudError>) =>
    call.pipe(Effect.catchCause(() => Effect.succeed(null)));

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

type LatestArgs = Omit<UseTransactionEnrichmentArgs, "groundedLookup" | "initialName" | "remoteEnabled"> & {
    groundedLookup: boolean;
    remoteEnabled: boolean;
};

interface EnrichmentPorts {
    curatedFallbackRef: RefObject<{ key: string; suggestion: EnrichmentSuggestion } | null>;
    forceRef: RefObject<boolean>;
    groundedTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
    inFlightRef: RefObject<Map<string, number>>;
    lastEmittedRef: RefObject<{ key: string; suggestion: EnrichmentSuggestion } | null>;
    lastRemoteOutcomeRef: RefObject<{ hasDomain: boolean; key: string } | null>;
    latest: RefObject<LatestArgs>;
    nameRef: RefObject<string>;
    recheckTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
    rememberedRef: RefObject<{ categoryId: string | null; key: string } | null>;
    remoteAbortRef: RefObject<AbortController | null>;
    requestIdRef: RefObject<number>;
    setPending: (pending: boolean) => void;
    start: (flow: Effect.Effect<void, unknown>) => void;
    timerRef: RefObject<ReturnType<typeof setTimeout> | null>;
}

function clearTimers({ groundedTimerRef, recheckTimerRef, timerRef }: EnrichmentPorts) {
    for (const ref of [timerRef, groundedTimerRef, recheckTimerRef]) {
        if (ref.current != null) {
            clearTimeout(ref.current);
            ref.current = null;
        }
    }
}

function supersedeRequest({ remoteAbortRef, requestIdRef }: EnrichmentPorts) {
    requestIdRef.current += 1;
    remoteAbortRef.current?.abort();
    remoteAbortRef.current = null;
}

function rememberedNow({ nameRef, rememberedRef }: EnrichmentPorts): string | null {
    const held = rememberedRef.current;
    if (held == null || held.key !== merchantKey(nameRef.current)) {
        return null;
    }
    return held.categoryId;
}

function emit(ports: EnrichmentPorts, suggestion: EnrichmentSuggestion) {
    const { lastEmittedRef, latest, nameRef } = ports;
    lastEmittedRef.current = { key: merchantKey(nameRef.current), suggestion };
    latest.current.onSuggest(latest.current.resolveLocal(withRemembered(suggestion, rememberedNow(ports))));
}

function emitNothing(ports: EnrichmentPorts) {
    emit(ports, NOTHING);
}

function resolveTransport({ latest }: EnrichmentPorts) {
    return latest.current.transport === undefined ? enrichmentTransport() : latest.current.transport;
}

function buildRequest({ latest, nameRef }: EnrichmentPorts, grounded: boolean) {
    return {
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
    };
}

// `askedIn` is the request's currency, not the one on screen: filing under the screen's would cache the old
// country's answer in the new partition.
function emitDomainResult(
    ports: EnrichmentPorts,
    key: string,
    result: RemoteEnrichmentResult | null,
    askedIn: string | undefined
): boolean {
    if (result?.domain == null || merchantKey(ports.nameRef.current) !== key) {
        return false;
    }
    if (result.grounding !== true) {
        setCachedEnrichment(key, result, askedIn);
    }
    const fallback = ports.curatedFallbackRef.current;
    if (fallback != null && fallback.key === key) {
        emit(ports, { ...fallback.suggestion, domain: result.domain });
    } else {
        emit(ports, toRemoteSuggestion(result));
    }
    return true;
}

function emitRemoteResult(ports: EnrichmentPorts, key: string, result: RemoteEnrichmentResult | null) {
    const fallback = ports.curatedFallbackRef.current;
    if (fallback != null && fallback.key === key) {
        if (result?.domain != null) {
            emit(ports, { ...fallback.suggestion, domain: result.domain });
        }
        return;
    }
    if (result == null) {
        emitNothing(ports);
        return;
    }
    emit(ports, toRemoteSuggestion(result));
}

// Every final answer `run` reaches without the model must supersede older requests, or one settling late emits
// the PREVIOUS name's suggestion (in the account editor, the last merchant's logo).
function supersedeInFlight(ports: EnrichmentPorts) {
    supersedeRequest(ports);
    // Cleared with the ticket, or `run` refuses to restart a name whose abandoned call is still out. `runRemote`
    // bumps the ticket as it starts, so this never drops a live request.
    ports.inFlightRef.current.clear();
    ports.setPending(false);
}

const recallFromLedger = Effect.fn("TransactionEnrichment.recallFromLedger")(function* recallFromLedger(
    ports: EnrichmentPorts,
    key: string
) {
    const { lastEmittedRef, latest, nameRef, rememberedRef } = ports;
    const resolve = latest.current.resolveHistory;
    if (resolve == null) {
        rememberedRef.current = { categoryId: null, key };
        return;
    }
    const categoryId = yield* resolve(key, latest.current.income);
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
});

const runRemote = Effect.fn("TransactionEnrichment.runRemote")(function* runRemote(
    ports: EnrichmentPorts,
    key: string
) {
    const { inFlightRef, lastRemoteOutcomeRef, nameRef, remoteAbortRef, requestIdRef, setPending } = ports;
    const call = resolveTransport(ports);
    if (call == null) {
        return;
    }
    supersedeRequest(ports);
    const id = requestIdRef.current;
    const controller = new AbortController();
    remoteAbortRef.current = controller;
    inFlightRef.current.set(key, id);
    setPending(true);
    const request = buildRequest(ports, false);
    const outcome = yield* fromCommand(enrichCommand, { call: call(request), signal: controller.signal }).pipe(
        Effect.exit
    );
    const result = Exit.isSuccess(outcome) ? Option.getOrNull(outcome.value) : null;
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
    emitRemoteResult(ports, key, result);
});

const recheckGrounded = Effect.fn("TransactionEnrichment.recheck")(function* recheckGrounded(
    ports: EnrichmentPorts,
    lookup: GroundedLookup,
    retriesLeft: number
) {
    const rechecked = yield* settledResult(
        lookup.call({
            ...lookup.request,
            groundedLookup: false,
            knowledgeOnly: true,
        })
    );
    if (lookup.stale() || emitDomainResult(ports, lookup.key, rechecked, lookup.request.currency)) {
        return;
    }
    if (retriesLeft > 0) {
        scheduleRecheck(ports, lookup, GROUNDED_RECHECK_RETRY_MS, retriesLeft - 1);
    }
});

function scheduleRecheck(ports: EnrichmentPorts, lookup: GroundedLookup, delay: number, retriesLeft: number) {
    ports.recheckTimerRef.current = setTimeout(() => ports.start(recheckGrounded(ports, lookup, retriesLeft)), delay);
}

interface GroundedLookup {
    call: NonNullable<ReturnType<typeof resolveTransport>>;
    key: string;
    request: ReturnType<typeof buildRequest>;
    stale: () => boolean;
}

const runGroundedFollowUp: (ports: EnrichmentPorts) => Effect.Effect<void> = Effect.fn(
    "TransactionEnrichment.runGroundedFollowUp"
)(function* groundedFollowUp(ports: EnrichmentPorts) {
    const { groundedTimerRef, inFlightRef, lastRemoteOutcomeRef, latest, nameRef, requestIdRef } = ports;
    // `remoteEnabled` too: a merchant the ledger already knew records an outcome, and its name must not leave
    // here.
    if (!latest.current.groundedLookup || !latest.current.remoteEnabled) {
        return;
    }
    const key = merchantKey(nameRef.current);
    const outcome = lastRemoteOutcomeRef.current;
    if (outcome == null || outcome.key !== key) {
        if (inFlightRef.current.has(key)) {
            groundedTimerRef.current = setTimeout(() => ports.start(runGroundedFollowUp(ports)), GROUNDED_IDLE_MS);
        }
        return;
    }
    if (outcome.hasDomain) {
        return;
    }
    const call = resolveTransport(ports);
    if (call == null) {
        return;
    }
    const ticket = requestIdRef.current;
    const request = buildRequest(ports, true);
    const stale = () =>
        ticket !== requestIdRef.current ||
        merchantKey(nameRef.current) !== key ||
        latest.current.currency !== request.currency;
    const result = yield* settledResult(call(request));
    if (stale()) {
        return;
    }
    if (emitDomainResult(ports, key, result, request.currency) || result?.grounding !== true) {
        return;
    }
    scheduleRecheck(ports, { call, key, request, stale }, GROUNDED_RECHECK_MS, 1);
});

const runLookup = Effect.fn("TransactionEnrichment.run")(function* runLookup(ports: EnrichmentPorts) {
    const { curatedFallbackRef, forceRef, inFlightRef, lastRemoteOutcomeRef, latest, nameRef, rememberedRef } = ports;
    // Read first: every early return below is final, and a force left standing would skip the next lookup's
    // cache.
    const force = forceRef.current;
    forceRef.current = false;
    const key = merchantKey(nameRef.current);
    if (key.length < MIN_KEY_LENGTH) {
        supersedeInFlight(ports);
        rememberedRef.current = null;
        emitNothing(ports);
        return;
    }
    if (force) {
        rememberedRef.current = { categoryId: null, key };
    } else {
        yield* Effect.forkDetach(logged("Failed to recall the merchant category")(recallFromLedger(ports, key)), {
            startImmediately: true,
        });
    }
    const match = resolveMerchant(key);
    let curatedFallback = false;
    if (match != null) {
        const curatedSuggestion = toCuratedSuggestion(match);
        emit(ports, curatedSuggestion);
        if (match.domain != null) {
            supersedeInFlight(ports);
            return;
        }
        curatedFallback = true;
        curatedFallbackRef.current = { key, suggestion: curatedSuggestion };
    }
    const localDomain = latest.current.resolveDomain?.(key) ?? null;
    if (localDomain != null) {
        const base = curatedFallback ? curatedFallbackRef.current?.suggestion : undefined;
        emit(ports, { ...(base ?? NOTHING), domain: localDomain });
        supersedeInFlight(ports);
        return;
    }
    const recalled = force
        ? null
        : ((yield* latest.current.recallMerchant?.(nameRef.current, latest.current.currency) ?? Effect.succeed(null)) ??
          null);
    if (merchantKey(nameRef.current) !== key) {
        return;
    }
    if (recalled != null) {
        lastRemoteOutcomeRef.current = { hasDomain: recalled.domain != null, key };
        emitRemoteResult(ports, key, recalled);
        supersedeInFlight(ports);
        return;
    }
    if (!latest.current.remoteEnabled) {
        if (!curatedFallback) {
            emitNothing(ports);
        }
        supersedeInFlight(ports);
        return;
    }
    const cached = force ? { hit: false as const } : getCachedEnrichment(key, latest.current.currency);
    if (cached.hit) {
        lastRemoteOutcomeRef.current = { hasDomain: cached.value?.domain != null, key };
        emitRemoteResult(ports, key, cached.value);
        supersedeInFlight(ports);
        return;
    }
    if (inFlightRef.current.has(key)) {
        if (!force) {
            return;
        }
        supersedeInFlight(ports);
    }
    yield* runRemote(ports, key);
});

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
        remoteEnabled,
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
    const recheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestIdRef = useRef(0);
    const remoteAbortRef = useRef<AbortController | null>(null);
    const runFlow = useAtomCommand(voidFlowCommand);
    const start = (flow: Effect.Effect<void, unknown>) => {
        void runFlow(logged("Merchant lookup failed")(flow));
    };
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
    const latest = useLatest(resolved);

    const ports: EnrichmentPorts = {
        curatedFallbackRef,
        forceRef,
        groundedTimerRef,
        inFlightRef,
        lastEmittedRef,
        lastRemoteOutcomeRef,
        latest,
        nameRef,
        recheckTimerRef,
        rememberedRef,
        remoteAbortRef,
        requestIdRef,
        setPending,
        start,
        timerRef,
    };

    const onNameChange = (next: string) => {
        nameRef.current = next;
        if (!latest.current.enabled) {
            return;
        }
        clearTimers(ports);
        timerRef.current = setTimeout(() => start(runLookup(ports)), DEBOUNCE_MS);
        groundedTimerRef.current = setTimeout(() => start(runGroundedFollowUp(ports)), GROUNDED_IDLE_MS);
    };

    const lookupNow = () => {
        if (!latest.current.enabled || forcingRef.current) {
            return;
        }
        forcingRef.current = true;
        setForcing(true);
        clearTimers(ports);
        forceRef.current = true;
        start(
            runLookup(ports).pipe(
                Effect.andThen(runGroundedFollowUp(ports)),
                Effect.ensuring(
                    Effect.sync(() => {
                        forcingRef.current = false;
                        setForcing(false);
                    })
                )
            )
        );
    };

    const cancel = useEffectEvent(() => {
        clearTimers(ports);
        supersedeRequest(ports);
        inFlightRef.current.clear();
    });

    if (!enabled && pending) {
        setPending(false);
    }

    // oxlint-disable-next-line outlayr/react-effect-budget -- cancels the debounce timers and aborts the in-flight lookup when enrichment turns off or the form unmounts
    useEffect(() => (enabled ? () => cancel() : undefined), [enabled]);

    // The same name in another currency can be another business, and the backfill treats a saved logo as final,
    // so a currency change asks again.
    const seenCurrencyRef = useRef(currency);
    const restartForCurrency = useEffectEvent(() => {
        supersedeInFlight(ports);
        lastRemoteOutcomeRef.current = null;
        const key = merchantKey(nameRef.current);
        if (key.length < MIN_KEY_LENGTH) {
            return;
        }
        const last = lastEmittedRef.current;
        if (last != null && last.key === key && last.suggestion.domain != null) {
            emit(ports, { ...last.suggestion, domain: null });
        }
        onNameChange(nameRef.current);
    });
    const seenIncomeRef = useRef(income);
    const restartForIncome = useEffectEvent(() => {
        supersedeInFlight(ports);
        lastRemoteOutcomeRef.current = null;
        if (merchantKey(nameRef.current).length < MIN_KEY_LENGTH) {
            return;
        }
        onNameChange(nameRef.current);
    });
    // oxlint-disable-next-line outlayr/react-effect-budget -- re-arms the lookup timers and request ticket held in refs when the currency or income a lookup is filed under changes
    useEffect(() => {
        const currencyChanged = seenCurrencyRef.current !== currency;
        const incomeChanged = seenIncomeRef.current !== income;
        seenCurrencyRef.current = currency;
        seenIncomeRef.current = income;
        if (!enabled) {
            return;
        }
        if (currencyChanged) {
            restartForCurrency();
        }
        if (incomeChanged) {
            restartForIncome();
        }
    }, [currency, enabled, income]);

    return { lookupNow, onNameChange, pending: pending || forcing };
}
