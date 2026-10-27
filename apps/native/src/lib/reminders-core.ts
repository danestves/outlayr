import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { NotificationPermissionsStatus } from "expo-notifications";

import type { ReminderPermission } from "@/domain/reminder";

const RemindersOperation = Schema.Literals(["cancel", "pending", "permission", "request", "schedule"]);

export class RemindersError extends Schema.TaggedError<RemindersError>()("RemindersError", {
    cause: Schema.Defect(),
    operation: RemindersOperation,
}) {
    override get message(): string {
        return `Reminders ${this.operation} failed`;
    }
}

export const attemptReminders = <A>(operation: typeof RemindersOperation.Type, run: () => Promise<A>) =>
    Effect.tryPromise({ catch: (cause) => new RemindersError({ cause, operation }), try: run });

export function toPermission(result: NotificationPermissionsStatus): ReminderPermission {
    if (result.granted) {
        return "granted";
    }
    return result.canAskAgain ? "undetermined" : "denied";
}

export interface DatedReminder {
    body: string;
    data: Record<string, string>;
    fireAt: Date;
    id: string;
    title: string;
}
