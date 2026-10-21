import { toggleFavouriteCurrency } from "@/data/favourite-currencies-core";
import type { Database } from "@/db/client";
import { isFavourite } from "@/domain/favourite-currencies";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";

// Reads the cap off the list the write produced: toggles are serialised, so the array at press time can be stale.
export function useToggleFavouriteCurrency(db: Database | null) {
    const haptics = useHaptics();
    const t = useTranslation();
    return (code: string, favourite: boolean) => {
        if (db === null) {
            return;
        }
        toggleFavouriteCurrency(db, code)
            .then((next) => {
                // oxlint-disable-next-line promise/no-callback-in-promise -- a press handler is not a promise chain, so the haptic has nowhere else to be sequenced from
                haptics(favourite || isFavourite(next, code) ? "light" : "warning");
            })
            // `toggleFavouriteCurrency`'s own `catch` guards its queue; the promise it returns still rejects.
            .catch((error) => {
                console.error("Failed to change the favourite currencies", error);
                notifyFailure({
                    body: t("settings.currency.favouriteFailedBody"),
                    title: t("settings.currency.favouriteFailedTitle"),
                });
            });
    };
}
