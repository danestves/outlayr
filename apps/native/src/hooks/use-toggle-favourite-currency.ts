import { RegistryContext } from "@effect/atom-react/RegistryContext";
import * as Cause from "effect/Cause";
import { use } from "react";

import type { Database } from "@/db/client";
import { isFavourite } from "@/domain/favourite-currencies";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { toggleFavouriteCurrencyCommand } from "@/state/settings-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

// Reads the cap off the list the write produced: toggles are serialised, so the array at press time can be stale.
export function useToggleFavouriteCurrency(db: Database | null) {
    const haptics = useHaptics();
    const t = useTranslation();
    const registry = use(RegistryContext);
    return (code: string, favourite: boolean) => {
        if (db === null) {
            return;
        }
        // The toggle's serialization lives in the operation (a semaphore), so a failed toggle does not block the next.
        fireAtomCommand(
            registry,
            toggleFavouriteCurrencyCommand,
            { code, db },
            {
                onFailure: (cause) => {
                    console.error("Failed to change the favourite currencies", Cause.squash(cause));
                    notifyFailure({
                        body: t("settings.currency.favouriteFailedBody"),
                        title: t("settings.currency.favouriteFailedTitle"),
                    });
                },
                onSuccess: (favourites) => haptics(favourite || isFavourite(favourites, code) ? "light" : "warning"),
            },
            SILENT
        );
    };
}
