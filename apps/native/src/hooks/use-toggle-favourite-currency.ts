import * as Cause from "effect/Cause";
import * as AsyncResult from "effect/reactivity/AsyncResult";

import type { Database } from "@/db/client";
import { isFavourite } from "@/domain/favourite-currencies";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { toggleFavouriteCurrencyCommand } from "@/state/settings-commands";
import { useAtomCommand } from "@/state/use-atom-command";

// Reads the cap off the list the write produced: toggles are serialised, so the array at press time can be stale.
export function useToggleFavouriteCurrency(db: Database | null) {
    const haptics = useHaptics();
    const t = useTranslation();
    const toggleFavouriteCurrency = useAtomCommand(toggleFavouriteCurrencyCommand, SILENT);
    return (code: string, favourite: boolean) => {
        if (db === null) {
            return;
        }
        // The toggle's serialization lives in the operation (a semaphore), so a failed toggle does not block the next.
        toggleFavouriteCurrency({ code, db }).then((result) => {
            if (AsyncResult.isFailure(result)) {
                console.error("Failed to change the favourite currencies", Cause.squash(result.cause));
                notifyFailure({
                    body: t("settings.currency.favouriteFailedBody"),
                    title: t("settings.currency.favouriteFailedTitle"),
                });
                return;
            }
            haptics(favourite || isFavourite(result.value, code) ? "light" : "warning");
        });
    };
}
