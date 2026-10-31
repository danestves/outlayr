import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";
import { checkForUpdateAsync, fetchUpdateAsync, reloadAsync } from "expo-updates";
import type { PurchasesPackage } from "react-native-purchases";

import { META_KEYS, setMeta } from "@/data/app-meta-core";
import { finishOnboarding, markReminderChosen } from "@/data/onboarding-core";
import type { PhotoFiles } from "@/data/photo-store-core";
import { setBoolSetting, setCurrency, setNumberSetting } from "@/data/settings-core";
import { exportTransactionsCsv } from "@/data/transfer-core";
import { flushDeferredDeletes } from "@/data/use-deferred-delete";
import type { Database } from "@/db/client";
import { lockFailureMessage } from "@/domain/app-lock";
import { serializeArchive } from "@/domain/archive";
import { enableReminderStep } from "@/domain/reminder";
import { requestUnlock } from "@/lib/app-lock";
import { shareFile } from "@/lib/data-transfer";
import { armLogoBackfill, cancelLogoBackfill } from "@/lib/logo-backfill";
import { Reminders } from "@/lib/reminders";
import { RevenueCat } from "@/lib/revenuecat-service";
import { appRuntime } from "@/lib/runtime";
import { syncTrialReminder } from "@/lib/trial-reminder";
import { openWalletShortcut } from "@/lib/wallet-shortcut";

import { createCommand, createRuntimeCommand, tapFailure } from "./atom-command";
import { exportArchive, restoreArchiveWithPhotos } from "./lifecycle-commands";

export class AppUpdateError extends Schema.TaggedError<AppUpdateError>()("AppUpdateError", {
    cause: Schema.Defect(),
    step: Schema.Literals(["check", "download", "reload"]),
}) {
    override get message(): string {
        return `Updating the app failed during ${this.step}`;
    }
}

export const checkForUpdateCommand = createCommand({
    execute: (_input: undefined) =>
        Effect.tryPromise({
            catch: (cause) => new AppUpdateError({ cause, step: "check" }),
            try: () => checkForUpdateAsync(),
        }),
    label: "update:check",
});

export const applyUpdateCommand = createCommand({
    execute: Effect.fn("Update.apply")(function* applyUpdate(input: { downloaded: boolean }) {
        if (!input.downloaded) {
            yield* Effect.tryPromise({
                catch: (cause) => new AppUpdateError({ cause, step: "download" }),
                try: () => fetchUpdateAsync(),
            });
        }
        yield* flushDeferredDeletes;
        yield* Effect.tryPromise({
            catch: (cause) => new AppUpdateError({ cause, step: "reload" }),
            try: () => reloadAsync(),
        });
    }),
    label: "update:apply",
});

export const saveOnboardingCurrencyCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Onboarding.saveCurrency")(function* saveCurrency(input: {
        code: string;
        db: Database;
        hold: Effect.Effect<unknown>;
        kind: "continue" | "finish";
        navigate: () => void;
        onFailure: (error: Error) => void;
        track: () => void;
    }) {
        yield* Effect.gen(function* save() {
            yield* setCurrency(input.db, input.code);
            if (input.kind === "continue") {
                input.navigate();
            } else {
                // `finishOnboarding` settles the root guard, which swaps the stack; pushing too would race it.
                yield* finishOnboarding(input.db);
            }
            input.track();
            yield* input.hold;
        }).pipe(tapFailure(input.onFailure));
    }),
    label: "onboarding:save-currency",
});

const bothSettled = <E1, E2>(first: Effect.Effect<unknown, E1>, second: Effect.Effect<unknown, E2>) =>
    Effect.all([Effect.exit(first), Effect.exit(second)], { concurrency: "unbounded" }).pipe(
        Effect.flatMap(([firstExit, secondExit]): Effect.Effect<void, E1 | E2> => {
            if (Exit.isFailure(firstExit)) {
                return Effect.failCause(firstExit.cause);
            }
            return Exit.isFailure(secondExit) ? Effect.failCause(secondExit.cause) : Effect.void;
        })
    );

export const chooseFirstRunReminderCommand = createCommand({
    execute: (input: { db: Database; option: number }) =>
        bothSettled(setNumberSetting(input.db, "notificationOption", input.option), markReminderChosen(input.db)),
    label: "onboarding:choose-reminder",
});

export const setReminderTimeCommand = createCommand({
    execute: (input: { db: Database; hour: number; minute: number }) =>
        bothSettled(
            setNumberSetting(input.db, "notificationHour", input.hour),
            setNumberSetting(input.db, "notificationMinute", input.minute)
        ),
    label: "settings:set-reminder-time",
});

export const setRemindersCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Settings.setReminders")(function* setReminders(input: {
        db: Database;
        next: boolean;
        onDenied: () => void;
    }) {
        if (!input.next) {
            yield* setBoolSetting(input.db, "showNotifications", false);
            return;
        }
        const reminders = yield* Reminders;
        const existing = yield* reminders.permission();
        if (enableReminderStep(existing) === "open-settings") {
            input.onDenied();
            return;
        }
        const granted = existing === "granted" ? existing : yield* reminders.request();
        if (granted !== "granted") {
            return;
        }
        yield* setBoolSetting(input.db, "showNotifications", true);
    }),
    label: "settings:set-reminders",
});

const revenueCatFlow = <W, A, E>(
    label: string,
    execute: (revenueCat: RevenueCat["Service"], input: W) => Effect.Effect<A, E>
) =>
    createRuntimeCommand(appRuntime, {
        execute: (input: W) => RevenueCat.pipe(Effect.flatMap((revenueCat) => execute(revenueCat, input))),
        label: `paywall:${label}`,
    });

export const confirmEntitlementCommand = revenueCatFlow("confirm", (revenueCat, accountId: string | null) =>
    revenueCat.mirror(accountId)
);

export const buyPlanCommand = revenueCatFlow(
    "buy",
    Effect.fn("Paywall.buy")(function* buy(
        revenueCat: RevenueCat["Service"],
        input: { accountId: string | null; offer: PurchasesPackage }
    ) {
        const outcome = yield* revenueCat.purchase(input.accountId, input.offer);
        if (outcome === "pro") {
            // Detached: the permission prompt must not hold the paywall open after the store sheet closes.
            yield* Effect.forkDetach(syncTrialReminder(true));
        }
        const mirrored = outcome !== "pro" || (yield* revenueCat.mirror(input.accountId));
        return { mirrored, outcome };
    })
);

export const restorePlanCommand = revenueCatFlow(
    "restore",
    Effect.fn("Paywall.restore")(function* restore(revenueCat: RevenueCat["Service"], accountId: string | null) {
        const restored = yield* revenueCat.restore(accountId);
        const mirrored = !restored || (yield* revenueCat.mirror(accountId));
        return { mirrored, restored };
    })
);

interface ShareInput {
    dialogTitle: string;
    fileName: string;
    mimeType: string;
    onBuilt: () => void;
}

const shareBuilt = Effect.fn("Export.share")(function* shareBuilt<E, R>(
    build: Effect.Effect<string, E, R>,
    input: ShareInput
) {
    const payload = yield* build;
    input.onBuilt();
    yield* shareFile(payload, input.fileName, input.mimeType, input.dialogTitle);
});

export const exportCsvCommand = createRuntimeCommand(appRuntime, {
    execute: (input: ShareInput & { db: Database }) => shareBuilt(exportTransactionsCsv(input.db), input),
    label: "export:csv",
});

export const exportArchiveFileCommand = createRuntimeCommand(appRuntime, {
    execute: (input: ShareInput & { db: Database; files: PhotoFiles; photos: () => Record<string, string> }) =>
        shareBuilt(
            exportArchive({ db: input.db, files: input.files, photos: input.photos }).pipe(
                // ponytail: one in-memory string with base64 photos; stream it to a zip if ledgers outgrow 512px JPEGs
                Effect.map(serializeArchive)
            ),
            input
        ),
    label: "export:archive",
});

const restoreSteps = Effect.fn("Restore.fromArchive")(function* restoreSteps(input: {
    db: Database;
    document: Parameters<typeof restoreArchiveWithPhotos>[0]["document"];
    files: PhotoFiles;
    writePhotos: () => void;
}) {
    yield* cancelLogoBackfill();
    yield* Effect.sync(input.writePhotos);
    yield* restoreArchiveWithPhotos({ db: input.db, document: input.document, files: input.files });
});

/** Stops the logo pass first: it could paint a row the archive replaced. */
export const restoreFromArchiveCommand = createRuntimeCommand(appRuntime, {
    execute: (input: Parameters<typeof restoreSteps>[0]) =>
        restoreSteps(input).pipe(Effect.ensuring(Effect.sync(() => armLogoBackfill(input.db)))),
    label: "restore:from-archive",
});

/** Records the link was taken, not that the shortcut exists: iOS reports nothing back, so the claim waits for a run. */
export const getWalletShortcutCommand = createCommand({
    execute: (db: Database) =>
        openWalletShortcut().pipe(Effect.andThen(setMeta(db, META_KEYS.walletShortcutAdded, "1"))),
    label: "wallet:get-shortcut",
});

export const toggleAppLockCommand = createCommand({
    execute: Effect.fn("Settings.toggleAppLock")(function* toggleAppLock(input: {
        db: Database;
        next: boolean;
        promptMessage: string;
    }) {
        const result = yield* requestUnlock(input.promptMessage);
        if (result.success) {
            yield* setBoolSetting(input.db, "biometricLock", input.next);
            return null;
        }
        return lockFailureMessage(result.error);
    }),
    label: "settings:toggle-app-lock",
});
