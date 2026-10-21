import { addDatabaseChangeListener } from "expo-sqlite";
import { useEffect } from "react";
import { AppState } from "react-native";

import { getMeta, META_KEYS, setMeta } from "@/data/app-meta-core";
import {
    backfillBudgetUsd,
    backfillCanonicalUsd,
    backfillOpeningUsd,
    stampLedgerCurrency,
} from "@/data/canonicalize-backfill";
import { settlePendingFees } from "@/data/card-fees-core";
import { subscribeToSettingChanges } from "@/data/database-changes";
import { drainPendingWrites, fileWaitingPurchases, takeRepriced } from "@/data/pending-writes-core";
import { applyRecentRates, pullRatesIfDue } from "@/data/rates";
import type { RateWireRow } from "@/data/rates";
import type { Database } from "@/db/client";
import { formatAmount } from "@/domain/money";
import { translateNow } from "@/i18n/runtime";
import { ratesPuller, watchRecentRates } from "@/lib/convex";
import { sendEnrichmentQueue } from "@/lib/enrichment-queue";
import { armLogoBackfill, backfillLogos } from "@/lib/logo-backfill";
import { notifyWarning } from "@/lib/notify";
import { onWatchPendingWrite } from "@/lib/watch-link";
import { publishWidgets } from "@/widgets/publish";

import { indexSpotlight } from "./spotlight";
import { affectsSpotlight, affectsWidgets, debounce, PUBLISH_DEBOUNCE_MS, SPOTLIGHT_DEBOUNCE_MS } from "./sync-cadence";
import { claimPendingWrites, readWalletLastRun, releasePendingWrites } from "./widget-bridge";

export function useSystemSync(db: Database | null): void {
    useEffect(() => {
        if (db == null) {
            return;
        }
        armLogoBackfill(db);

        const publish = debounce(PUBLISH_DEBOUNCE_MS, () => {
            publishWidgets(db);
        });
        const reindex = debounce(SPOTLIGHT_DEBOUNCE_MS, () => {
            indexSpotlight(db);
        });

        // The drain's writes trip the change listener, so it publishes itself only when nothing applied. Logos run
        // after the drain so a Wallet purchase that just landed is in the set they read.
        const catchUp = () => {
            mirrorWalletRun(db).catch((error) => {
                console.warn("[outlayr] wallet run stamp failed", error);
            });
            drainPendingWrites(db, claimPendingWrites, releasePendingWrites)
                .then((applied) => {
                    if (applied === 0) {
                        publish.schedule();
                    }
                })
                .catch((error) => {
                    console.warn("[outlayr] pending writes failed to apply", error);
                    publish.schedule();
                })
                .then(() => {
                    sendEnrichmentQueue(db);
                    return fileWaitingPurchases(db);
                })
                .catch((error) => {
                    console.warn("[outlayr] waiting purchases failed to file", error);
                })
                .then(() => announceRepriced(db))
                .catch((error) => {
                    console.warn("[outlayr] repriced subscriptions failed to announce", error);
                })
                .then(() => backfillLogos(db))
                .catch((error) => {
                    console.warn("[outlayr] logo backfill failed", error);
                });
        };

        catchUp();
        indexSpotlight(db);
        // Republished explicitly: a refresh's unqualified `DELETE FROM exchangeRates` hits SQLite's truncate
        // optimization, which skips the update hook the listener relies on (expo-sqlite `sqlite3.h:7090-7095`).
        let unwatchRates: (() => void) | null = null;
        let disposed = false;
        const applyLive = (rows: RateWireRow[]) => {
            applyLiveRates(db, rows).then((landed) => {
                if (landed) {
                    publish.schedule();
                }
            });
        };
        const syncRates = () => {
            unwatchRates?.();
            unwatchRates = null;
            refreshRates(db).then((changed) => {
                if (changed) {
                    publish.schedule();
                }
                if (disposed) {
                    return;
                }
                unwatchRates?.();
                unwatchRates = watchRecentRates(applyLive);
            });
        };
        syncRates();

        const listener = addDatabaseChangeListener((event) => {
            if (affectsWidgets(event.tableName)) {
                publish.schedule();
            }
            if (affectsSpotlight(event.tableName)) {
                reindex.schedule();
            }
        });
        const unsubscribeSettings = subscribeToSettingChanges(db, () => {
            publish.schedule();
            reindex.schedule();
        });

        const unwatchWrites = onWatchPendingWrite(catchUp);

        const subscription = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                catchUp();
                syncRates();
            } else if (state === "background") {
                publish.cancel();
                reindex.cancel();
                publishWidgets(db);
                indexSpotlight(db);
            }
        });

        return () => {
            disposed = true;
            unwatchRates?.();
            publish.cancel();
            reindex.cancel();
            listener.remove();
            unsubscribeSettings();
            subscription.remove();
            unwatchWrites();
        };
    }, [db]);
}

async function mirrorWalletRun(db: Database): Promise<void> {
    const at = readWalletLastRun();
    if (at == null) {
        return;
    }
    const stamp = String(at);
    if ((await getMeta(db, META_KEYS.walletLastRunAt)) === stamp) {
        return;
    }
    await setMeta(db, META_KEYS.walletLastRunAt, stamp);
}

async function refreshRates(db: Database): Promise<boolean> {
    let changed = false;
    try {
        changed = await pullRatesIfDue(db, ratesPuller());
    } catch (error) {
        console.warn("[outlayr] rate refresh failed", error);
    }
    return (await revalueLedger(db)) || changed;
}

async function applyLiveRates(db: Database, rows: RateWireRow[]): Promise<boolean> {
    let changed = false;
    try {
        changed = await applyRecentRates(db, rows);
    } catch (error) {
        console.warn("[outlayr] live rates failed to apply", error);
    }
    return (await revalueLedger(db)) || changed;
}

async function revalueLedger(db: Database): Promise<boolean> {
    let changed = false;
    // Stamp first: canonicalization skips rows that do not yet name the currency they were kept in.
    try {
        changed = (await stampLedgerCurrency(db)) > 0;
    } catch (error) {
        console.warn("[outlayr] currency stamp failed", error);
    }
    // Always: an offline entry can leave rows unvalued even when the rate cache was already fresh.
    try {
        changed = (await backfillCanonicalUsd(db)) > 0 || changed;
        changed = (await backfillBudgetUsd(db)) > 0 || changed;
        changed = (await backfillOpeningUsd(db)) > 0 || changed;
        changed = (await settlePendingFees(db)) > 0 || changed;
    } catch (error) {
        console.warn("[outlayr] canonicalization backfill failed", error);
    }
    return changed;
}

async function announceRepriced(db: Database): Promise<void> {
    for (const entry of await takeRepriced(db)) {
        notifyWarning({
            body: translateNow("log.repriced.body", { from: formatAmount(entry.from, entry.currency) }),
            title: translateNow("log.repriced.title", { name: entry.note, to: formatAmount(entry.to, entry.currency) }),
        });
    }
}
