import { transactionsRepo } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { askForReviewIfPending } from "@/lib/review-prompt";

import { createCommand } from "./atom-command";

export const markReviewedCommand = createCommand({
    execute: (input: { db: Database; ids: readonly string[] }) => transactionsRepo.markReviewed(input.db, input.ids),
    label: "transactions:mark-reviewed",
});

export const askForReviewIfPendingCommand = createCommand({
    execute: (db: Database) => askForReviewIfPending(db),
    label: "review:ask-if-pending",
});
