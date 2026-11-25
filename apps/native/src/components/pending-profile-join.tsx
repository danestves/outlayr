import { useDatabase } from "@/contexts/local-data-context";
import { useTranslation } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";
import { useCloudAccount } from "@/lib/convex";
import { useWhen } from "@/lib/lifecycle";
import { notifyFailure } from "@/lib/notify";
import { takePendingProfileJoin, usePendingProfileJoin } from "@/lib/profile-sharing";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { joinProfileCommand } from "@/state/joined-profiles-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

/** Claims a profile invite the viewer tapped while signed out, once the account and its ledger are ready. */
export function PendingProfileJoin({ ready }: { ready: boolean }) {
    const db = useDatabase();
    const t = useTranslation();
    const { accountId } = useAuthSession();
    const cloudAccount = useCloudAccount();
    const pending = usePendingProfileJoin();

    useWhen(ready && pending !== null && accountId !== null && cloudAccount, () => {
        const code = takePendingProfileJoin();
        if (code === null) {
            return;
        }
        const fail = () => {
            notifyFailure({
                body: t("sharing.error.generic.body"),
                title: t("sharing.error.generic.title"),
            });
        };
        fireAtomCommand(
            appAtomRegistry,
            joinProfileCommand,
            { accountId, code, from: db },
            {
                onFailure: fail,
                onSuccess: (status) => {
                    if (status !== "joined") {
                        fail();
                    }
                },
            },
            SILENT
        );
    });

    return null;
}
