import * as Effect from "effect/Effect";

import { useAuthSession } from "@/lib/auth-session";
import { useMirror } from "@/lib/lifecycle";
import { posthog } from "@/lib/posthog";
import { createCommand, SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { fireAtomCommand } from "@/state/use-atom-action";

const posthogReadyCommand = createCommand({
    execute: (client: NonNullable<typeof posthog>) => Effect.tryPromise(() => client.ready()),
    label: "posthog:ready",
});

export function usePostHogIdentity() {
    const { accountId, gate } = useAuthSession();
    useMirror([accountId, gate], () => {
        const client = posthog;
        if (client === null) {
            return;
        }
        if (accountId !== null) {
            client.identify(accountId);
            return;
        }
        if (gate !== "signed-out") {
            return;
        }
        let live = true;
        fireAtomCommand(
            appAtomRegistry,
            posthogReadyCommand,
            client,
            {
                onSuccess: () => {
                    if (live && client.getDistinctId() !== client.getAnonymousId()) {
                        client.reset();
                    }
                },
            },
            SILENT
        );
        return () => {
            live = false;
        };
    });
}
