import { useDatabase } from "@/contexts/local-data-context";
import { useTranslation } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";
import { useWhen } from "@/lib/lifecycle";
import { notifyFailure } from "@/lib/notify";
import { takePendingProfileJoin, usePendingProfileJoin } from "@/lib/profile-sharing";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { joinProfileCommand } from "@/state/joined-profiles-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

/** Claims a profile invite the viewer tapped while signed out, once an account exists. */
export function PendingProfileJoin() {
    const db = useDatabase();
    const t = useTranslation();
    const { accountId } = useAuthSession();
    const pending = usePendingProfileJoin();

    useWhen(pending !== null && accountId !== null, () => {
        const code = takePendingProfileJoin();
        if (code === null) {
            return;
        }
        fireAtomCommand(
            appAtomRegistry,
            joinProfileCommand,
            { accountId, code, from: db },
            {
                onSuccess: (status) => {
                    if (status !== "joined") {
                        notifyFailure({
                            body: t("sharing.error.generic.body"),
                            title: t("sharing.error.generic.title"),
                        });
                    }
                },
            },
            SILENT
        );
    });

    return null;
}
