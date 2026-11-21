import * as Effect from "effect/Effect";
import { useRef, useState } from "react";

import { readIdentityLink } from "@/domain/identity-link";
import type { TranslationKey } from "@/i18n/catalog";
import { useOnUnmount, useTimers } from "@/lib/lifecycle";
import { checkLinkLogo, discardStoredPhoto, voidAppFlowCommand } from "@/state/entry-commands";
import type { MerchantWebsiteLogo } from "@/state/entry-commands";
import { useAtomCommand } from "@/state/use-atom-command";

export type LinkStatus =
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "found"; host: string; photoUri: string; source: "image" | "website" }
    | { kind: "refused"; platform: string }
    | { kind: "missing" };

export const LINK_FOUND_LABEL = {
    image: "transaction.identity.imageFound",
    website: "transaction.website.found",
} satisfies Record<"image" | "website", TranslationKey>;

const IDLE: LinkStatus = { kind: "idle" };
const CHECK_DELAY_MS = 800;

export function useLinkLogo(onFound: (logo: MerchantWebsiteLogo) => void) {
    const runFlow = useAtomCommand(voidAppFlowCommand);
    const [text, setText] = useState("");
    const [status, setStatus] = useState<LinkStatus>(IDLE);
    const ticket = useRef(0);
    const timers = useTimers();

    const cancel = () => {
        ticket.current += 1;
        timers.clear();
    };

    // A result landing after the picker closes would write into whichever form opens next.
    useOnUnmount(() => {
        ticket.current += 1;
    });

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
        timers.after(delay, () => {
            void runFlow(
                checkLinkLogo(link).pipe(
                    Effect.flatMap((found) =>
                        Effect.sync(() => {
                            if (asked !== ticket.current) {
                                if (found !== null) {
                                    discardStoredPhoto(found.logo.photoUri);
                                }
                                return;
                            }
                            if (found === null) {
                                setStatus({ kind: "missing" });
                                return;
                            }
                            setStatus({
                                host: link.domain,
                                kind: "found",
                                photoUri: found.logo.photoUri,
                                source: found.source,
                            });
                            onFound(found.logo);
                        })
                    )
                )
            );
        });
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
