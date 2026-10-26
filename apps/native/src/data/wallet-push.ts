import { and, eq, isNull, ne, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { NOTIFICATION_PATTERNS } from "@/domain/parse-notification";
import { translateNow } from "@/i18n/runtime";
import type { WalletPushSnapshot } from "@/lib/widget-bridge";

import { accountsRepo } from "./accounts-core";
import { getMeta, META_KEYS } from "./app-meta-core";
import { cardStatus, filedNote, parseWalletCards } from "./pending-writes-core";

export class WalletPushError extends Schema.TaggedError<WalletPushError>()("WalletPushError", {
    cause: Schema.Defect(),
    operation: Schema.Literal("filed"),
}) {
    override get message(): string {
        return `Reading the wallet push ${this.operation} failed`;
    }
}

const attempt = <A>(operation: typeof WalletPushError.Type.operation, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new WalletPushError({ cause, operation }), try: run });

export const buildWalletPush = Effect.fn("WalletPush.buildWalletPush")(function* buildWalletPush(db: Database) {
    const live = yield* accountsRepo.listBanks(db);
    const walletCards = parseWalletCards(yield* getMeta(db, META_KEYS.walletCards));
    const filed = yield* attempt("filed", () =>
        db
            .select({
                category: categories.name,
                income: transactions.income,
                latest: sql<number>`max(${transactions.date})`,
                note: filedNote,
            })
            .from(transactions)
            .leftJoin(categories, eq(categories.id, transactions.categoryId))
            .where(and(isNull(transactions.deletedAt), ne(transactions.note, "")))
            .groupBy(filedNote, transactions.income)
    );

    const cards: WalletPushSnapshot["cards"] = {};
    for (const card of walletCards) {
        const { account, asks } = cardStatus(card.text, walletCards, live);
        if (account) {
            cards[card.text] = { label: account.name, pick: false };
        } else if (asks) {
            cards[card.text] = {
                label: translateNow("settings.wallet.pushWhichAccount", { card: card.text }),
                pick: true,
            };
        } else {
            cards[card.text] = { label: null, pick: false };
        }
    }

    const newest = new Map<string, (typeof filed)[number]>();
    for (const row of filed) {
        const key = `${row.income}:${row.note.normalize("NFC")}`;
        const kept = newest.get(key);
        if (!kept || row.latest > kept.latest) {
            newest.set(key, row);
        }
    }
    const places: WalletPushSnapshot["places"] = { expense: {}, income: {} };
    for (const row of newest.values()) {
        if (row.category) {
            places[row.income ? "income" : "expense"][row.note.normalize("NFC")] = row.category;
        }
    }

    const patterns = Object.fromEntries(
        Object.entries(NOTIFICATION_PATTERNS).map(([name, { ignoreCase, source }]) => [name, { ignoreCase, source }])
    );
    return {
        cards,
        newPlace: translateNow("settings.wallet.pushNewPlace"),
        patterns,
        places,
    } satisfies WalletPushSnapshot;
});
