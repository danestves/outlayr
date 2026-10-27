import { useEffect, useEffectEvent, useRef } from "react";

import { resolveInstitutionDomain } from "@/domain/institution-map";
import type { EnrichmentFn } from "@/lib/convex";
import { persistLogo as persistLogoDefault } from "@/lib/persist-logo";
import { useLatest } from "@/lib/use-latest";
import { fetchMerchantLogo } from "@/state/capture-commands";

import { useTransactionEnrichment } from "./use-transaction-enrichment";
import type { EnrichmentSuggestion } from "./use-transaction-enrichment";

export interface AccountLogo {
    imageColor: string | null;
    imageUri: string;
}

export interface UseAccountIdentityArgs {
    canAttach?: () => boolean;
    enabled: boolean;
    fetchImage?: typeof fetchMerchantLogo;
    groundedLookup?: boolean;
    initialName?: string;
    locale?: string;
    onClear: () => void;
    onLogo: (logo: AccountLogo) => void;
    persistLogo?: (bytes: Uint8Array) => Promise<AccountLogo>;
    regionCode?: string;
    remoteEnabled?: boolean;
    transport?: EnrichmentFn | null;
}

export interface UseAccountIdentityResult {
    onNameChange: (next: string) => void;
    pending: boolean;
}

const resolveLocal = (suggestion: EnrichmentSuggestion) => suggestion;

export function useAccountIdentity(args: UseAccountIdentityArgs): UseAccountIdentityResult {
    const {
        enabled,
        remoteEnabled = true,
        groundedLookup = true,
        locale,
        regionCode,
        canAttach,
        onLogo,
        onClear,
        transport,
        fetchImage = fetchMerchantLogo,
        persistLogo = persistLogoDefault,
    } = args;

    const nameRef = useRef("");
    const ticketRef = useRef(0);
    const latest = useLatest({ canAttach, fetchImage, onClear, onLogo, persistLogo });

    const attach = async (domain: string | null) => {
        const blocked = () => latest.current.canAttach?.() === false;
        if (blocked()) {
            return;
        }
        ticketRef.current += 1;
        const ticket = ticketRef.current;
        const stale = () => ticket !== ticketRef.current || blocked();
        if (domain == null) {
            latest.current.onClear();
            return;
        }
        const outcome = await latest.current.fetchImage({
            domain,
            name: nameRef.current,
        });
        if (stale()) {
            return;
        }
        if (outcome.kind !== "logo") {
            latest.current.onClear();
            return;
        }
        let logo: AccountLogo;
        try {
            logo = await latest.current.persistLogo(outcome.bytes);
        } catch {
            return;
        }
        if (stale()) {
            return;
        }
        latest.current.onLogo(logo);
    };

    const onSuggest = (suggestion: EnrichmentSuggestion) => {
        attach(suggestion.domain);
    };

    const { onNameChange: enrich, pending } = useTransactionEnrichment({
        categoryTree: [],
        enabled,
        groundedLookup,
        income: false,
        locale,
        onSuggest,
        regionCode,
        remoteEnabled,
        resolveDomain: resolveInstitutionDomain,
        resolveLocal,
        transport,
    });

    const onNameChange = (next: string) => {
        nameRef.current = next;
        enrich(next);
    };

    const { initialName } = args;
    const enrichInitialName = useEffectEvent(() => {
        if (enabled && initialName != null && initialName.trim().length > 0) {
            onNameChange(initialName);
        }
    });
    // The enrichment teardown cancels its timers but not an `attach` already past them, whose logo would land in the
    // next editor's draft; taking the ticket on the way out makes it stale.

    // oxlint-disable-next-line outlayr/react-effect-budget -- starts the logo lookup for the account's existing name when the editor opens and invalidates an attach in flight when it closes
    useEffect(() => {
        enrichInitialName();
        return () => {
            ticketRef.current += 1;
        };
    }, []);

    return { onNameChange, pending };
}
