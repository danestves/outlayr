import { RegistryContext } from "@effect/atom-react/RegistryContext";
import { use, useEffect, useEffectEvent, useRef } from "react";

import { resolveInstitutionDomain } from "@/domain/institution-map";
import type { EnrichmentFn } from "@/lib/convex";
import { useLatest } from "@/lib/use-latest";
import { attachAccountLogoCommand } from "@/state/identity-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

import { useTransactionEnrichment } from "./use-transaction-enrichment";
import type { EnrichmentSuggestion } from "./use-transaction-enrichment";

export interface AccountLogo {
    imageColor: string | null;
    imageUri: string;
}

export interface UseAccountIdentityArgs {
    canAttach?: () => boolean;
    enabled: boolean;
    groundedLookup?: boolean;
    initialName?: string;
    locale?: string;
    onClear: () => void;
    onLogo: (logo: AccountLogo) => void;
    regionCode?: string;
    remoteEnabled: boolean;
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
        remoteEnabled,
        groundedLookup = true,
        locale,
        regionCode,
        canAttach,
        onLogo,
        onClear,
        transport,
    } = args;

    const registry = use(RegistryContext);
    const nameRef = useRef("");
    const ticketRef = useRef(0);
    const latest = useLatest({ canAttach, onClear, onLogo });

    const blocked = () => latest.current.canAttach?.() === false;

    const attach = (domain: string | null) => {
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
        fireAtomCommand(
            registry,
            attachAccountLogoCommand,
            { domain, name: nameRef.current, stale },
            {
                onSuccess: (attached) => {
                    if (stale()) {
                        return;
                    }
                    if (attached.kind === "clear") {
                        latest.current.onClear();
                    } else if (attached.kind === "logo") {
                        latest.current.onLogo(attached.logo);
                    }
                },
            }
        );
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
