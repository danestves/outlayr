import { useAtomValue } from "@effect/atom-react/Hooks";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as Schema from "effect/Schema";
import { use } from "react";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { localDataAtom, useLocalData } from "@/contexts/local-data-context";
import { closeDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { useTranslation } from "@/i18n/context";

import { CloudError } from "./cloud-error";
import { DeletionResumeError, resumePersistedCloudDeletion } from "./deletion-resume";
import { createDeviceResetGate } from "./device-data-reset";
import { ProviderRevocationError } from "./provider-revocation";
import { appRuntime } from "./runtime";

export class DeviceRecoveryError extends Schema.TaggedError<DeviceRecoveryError>()("DeviceRecoveryError", {
    failures: Schema.optional(Schema.Array(Schema.String)),
    reason: Schema.Literals(["incomplete", "unavailable"]),
}) {
    override get message(): string {
        return this.reason === "unavailable"
            ? "Local database is unavailable for device reset"
            : `Device cleanup incomplete: ${this.failures?.join(", ")}`;
    }
}

const recoverDevice = Effect.fn("DeviceResetRecovery.recover")(function* recoverDevice(
    db: Database | null,
    reopen: () => void
) {
    if (db === null) {
        return yield* new DeviceRecoveryError({ reason: "unavailable" });
    }
    // Set only when the sweep reached the sqlite store: reopening after an ordinary launch publishes
    // `status: "opening"`, which un-gates this in `_layout`, remounts it and loops forever.
    let closed = false;
    const result = yield* createDeviceResetGate({
        // Close only: `reopen()` here starts a reopen racing `deleteDatabaseAsync`, so the delete loses to a
        // locked file or a ledger is re-seeded mid-erase. `settings/account` closes the same way.
        closeDatabase: Effect.sync(() => {
            closed = true;
        }).pipe(Effect.andThen(closeDatabase(db))),
        completeCloudDeletion: resumePersistedCloudDeletion({ clearOnComplete: false, required: true }).pipe(
            Effect.asVoid
        ),
    }).recover();
    if (result.failures.length > 0) {
        return yield* new DeviceRecoveryError({ failures: result.failures, reason: "incomplete" });
    }
    if (closed) {
        reopen();
    }
});

const isCloudWrapper = Schema.is(Schema.Union([CloudError, DeletionResumeError, ProviderRevocationError]));

const deviceRecoveryAtom = Atom.family((db: Database | null) =>
    appRuntime
        .atom((get) => recoverDevice(db, () => get.refresh(localDataAtom)))
        .pipe(Atom.withLabel("device-reset:recover"))
);

export function DeviceResetRecovery({ children }: { children: ReactNode }) {
    const { db } = useLocalData();
    const t = useTranslation();
    const registry = use(RegistryContext);
    const recovery = deviceRecoveryAtom(db);
    const result = useAtomValue(recovery);

    if (AsyncResult.isFailure(result) && !result.waiting) {
        const squashed = Cause.squash(result.cause);
        const failure = isCloudWrapper(squashed) && squashed.cause instanceof Error ? squashed.cause : squashed;
        const message = failure instanceof Error ? failure.message : String(failure);
        return (
            <View className="bg-background flex-1 items-center justify-center px-8">
                <Text className="font-sans-semibold text-foreground text-title pb-2">
                    {t("settings.account.resetFailedTitle")}
                </Text>
                <Text className="text-muted text-subtitle pb-4 text-center">{message}</Text>
                <Pressable
                    accessibilityRole="button"
                    className="bg-accent rounded-full px-6 py-3"
                    onPress={() => registry.refresh(recovery)}
                >
                    <Text className="font-sans-semibold text-accent-foreground text-subtitle">{t("common.retry")}</Text>
                </Pressable>
            </View>
        );
    }

    return AsyncResult.isSuccess(result) && !result.waiting ? children : null;
}
