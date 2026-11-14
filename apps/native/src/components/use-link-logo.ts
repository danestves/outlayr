import * as Effect from "effect/Effect";
import { useEffect, useRef, useState } from "react";

import { readIdentityLink } from "@/domain/identity-link";
import { checkMerchantWebsite, discardStoredPhoto, voidAppFlowCommand } from "@/state/entry-commands";
import type { MerchantWebsiteLogo } from "@/state/entry-commands";
import { useAtomCommand } from "@/state/use-atom-command";

export type LinkStatus =
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "found"; domain: string; photoUri: string }
    | { kind: "refused"; platform: string }
    | { kind: "missing" };

const IDLE: LinkStatus = { kind: "idle" };
const CHECK_DELAY_MS = 800;

export function useLinkLogo(onFound: (logo: MerchantWebsiteLogo) => void) {
    const runFlow = useAtomCommand(voidAppFlowCommand);
    const [text, setText] = useState("");
    const [status, setStatus] = useState<LinkStatus>(IDLE);
    const ticket = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancel = () => {
        ticket.current += 1;
        if (timer.current !== null) {
            clearTimeout(timer.current);
            timer.current = null;
        }
    };

    // oxlint-disable-next-line outlayr/react-effect-budget -- a result landing after the picker closes would write into whichever form opens next
    useEffect(
        () => () => {
            ticket.current += 1;
            if (timer.current !== null) {
                clearTimeout(timer.current);
            }
        },
        []
    );

    const lookUp = (input: string, delay: number) => {
        cancel();
        const link = readIdentityLink(input);
        if (link.kind === "unreadable") {
            setStatus(IDLE);
            return;
        }
        if (link.kind === "refused") {
            setStatus(link);
            return;
        }
        setStatus({ kind: "checking" });
        const asked = ticket.current;
        timer.current = setTimeout(() => {
            // The page has no merchant name yet, so the domain keys the logo cache.
            void runFlow(
                checkMerchantWebsite(link.domain, link.domain).pipe(
                    Effect.flatMap((logo) =>
                        Effect.sync(() => {
                            if (asked !== ticket.current) {
                                if (logo !== null) {
                                    discardStoredPhoto(logo.photoUri);
                                }
                                return;
                            }
                            if (logo === null) {
                                setStatus({ kind: "missing" });
                                return;
                            }
                            setStatus({ domain: logo.domain, kind: "found", photoUri: logo.photoUri });
                            onFound(logo);
                        })
                    )
                )
            );
        }, delay);
    };

    return {
        change: (next: string) => {
            setText(next);
            lookUp(next, CHECK_DELAY_MS);
        },
        clear: () => {
            cancel();
            setText("");
            setStatus(IDLE);
        },
        /** Another identity was chosen, so a pending logo must not land over it. */
        drop: () => {
            cancel();
            setStatus(IDLE);
        },
        status,
        submit: () => lookUp(text, 0),
        text,
    };
}

/** A photo picked after the lookup replaces the logo, and the line must stop claiming it. */
export function shownLinkStatus(status: LinkStatus, photoUri: string | null): LinkStatus {
    return status.kind === "found" && status.photoUri !== photoUri ? IDLE : status;
}
