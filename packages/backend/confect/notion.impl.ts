import { FunctionImpl, GroupImpl } from "@confect/server";
import { ConvexError } from "convex/values";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import { components } from "../convex/_generated/api";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { ActionCtx, MutationCtx, MutationRunner, QueryCtx } from "./_generated/services";
import { optionalUserId, Unauthenticated } from "./lib/auth";
import { decryptStoredToken, linkedAccessToken } from "./lib/betterAuth";
import { notionConfig } from "./lib/config";
import { outboundHttp } from "./lib/http";
import {
    columnNames,
    getDataSource,
    looksLikeLedger,
    MAX_NOTION_ROWS,
    NOTION_PROVIDER_ID,
    NotionNotConnected,
    pageTitle,
    queryPages,
    relationSources,
    revokeToken,
    searchDataSources,
    sourceTitle,
    tableRows,
    workspaceName,
} from "./notion";
import type { NotionError } from "./notion";
import spec from "./notion.spec";
import { requirePro } from "./revenuecat";

const NOTION_ACCOUNT_PAGE = 10;

const notionAccountWhere = (userId: string) => [
    { field: "userId", operator: "eq" as const, value: userId },
    { field: "providerId", operator: "eq" as const, value: NOTION_PROVIDER_ID },
];

const actionUserId = Effect.fn("Notion.actionUserId")(function* actionUserId() {
    const userId = yield* optionalUserId(yield* ActionCtx);
    if (userId === null) {
        return yield* new Unauthenticated();
    }
    return userId;
});

const accessToken = Effect.fn("Notion.accessToken")(function* accessToken(userId: string) {
    const ctx = yield* ActionCtx;
    const token = yield* Effect.tryPromise({
        catch: () => new NotionNotConnected(),
        try: () => linkedAccessToken(ctx, NOTION_PROVIDER_ID, userId),
    });
    return Redacted.make(token);
});

const forgetConnection = Effect.fn("Notion.forgetConnection")(function* forgetConnection(userId: string) {
    const { runMutation } = yield* MutationRunner;
    yield* runMutation(refs.internal.notion.forget, { userId });
});

const notionFailure = (userId: string) => (error: NotionError) =>
    Effect.gen(function* failNotion() {
        if (error.reason === "revoked") {
            yield* forgetConnection(userId);
            return yield* Effect.die(new ConvexError({ code: "NOTION_REVOKED" }));
        }
        yield* Console.error(error.message, error.cause);
        return yield* Effect.die(
            new ConvexError({ code: error.reason === "rateLimited" ? "NOTION_RATE_LIMITED" : "NOTION_UNAVAILABLE" })
        );
    });

const proUserToken = Effect.fn("Notion.proUserToken")(function* proUserToken() {
    const userId = yield* actionUserId();
    yield* requirePro(yield* ActionCtx, userId);
    return { token: yield* accessToken(userId), userId };
});

const refusedWith = (code: string) => () => Effect.die(new ConvexError({ code }));

const refusals = {
    NotionNotConnected: refusedWith("NOTION_NOT_CONNECTED"),
    ProRequired: refusedWith("PRO_REQUIRED"),
    Unauthenticated: refusedWith("UNAUTHENTICATED"),
};

const connected = FunctionImpl.make(
    databaseSchema,
    spec,
    "connected",
    Effect.fn("Notion.connected")(function* connected() {
        const ctx = yield* QueryCtx;
        const userId = yield* optionalUserId(ctx);
        if (userId === null) {
            return false;
        }
        const account = yield* Effect.promise(() =>
            ctx.runQuery(components.betterAuth.adapter.findOne, {
                model: "account",
                where: notionAccountWhere(userId),
            })
        );
        return account !== null;
    }, Effect.orDie)
);

const sources = FunctionImpl.make(
    databaseSchema,
    spec,
    "sources",
    Effect.fn("Notion.sources")(
        function* sources() {
            const { token, userId } = yield* proUserToken();
            return yield* Effect.all({
                found: searchDataSources(token),
                name: workspaceName(token),
            }).pipe(
                Effect.map(({ found, name }) => ({
                    sources: found.map((source) => ({
                        columns: columnNames(source),
                        id: source.id,
                        ledger: looksLikeLedger(source),
                        title: sourceTitle(source),
                    })),
                    workspaceName: name,
                })),
                Effect.provide(outboundHttp),
                Effect.catchTags({ NotionError: notionFailure(userId) })
            );
        },
        Effect.catchTags(refusals),
        Effect.orDie
    )
);

const relationTitles = Effect.fn("Notion.relationTitles")(function* relationTitles(
    token: Redacted.Redacted,
    sourceIds: readonly string[]
) {
    const titles = new Map<string, string>();
    for (const sourceId of sourceIds) {
        const pages = yield* queryPages(token, sourceId).pipe(
            Effect.catchIf(
                (error) => error.reason === "status",
                () => Effect.succeed([])
            )
        );
        for (const page of pages) {
            titles.set(page.id, pageTitle(page));
        }
    }
    return titles;
});

const tables = FunctionImpl.make(
    databaseSchema,
    spec,
    "tables",
    Effect.fn("Notion.tables")(
        function* tables(args) {
            const { token, userId } = yield* proUserToken();
            return yield* Effect.all(
                args.ids.map((id) =>
                    Effect.gen(function* table() {
                        const source = yield* getDataSource(token, id);
                        const pages = yield* queryPages(token, id);
                        const titles = yield* relationTitles(token, relationSources(source));
                        const header = columnNames(source);
                        return {
                            header,
                            rows: tableRows(header, pages, titles),
                            title: sourceTitle(source),
                            truncated: pages.length >= MAX_NOTION_ROWS,
                        };
                    })
                )
            ).pipe(Effect.provide(outboundHttp), Effect.catchTags({ NotionError: notionFailure(userId) }));
        },
        Effect.catchTags(refusals),
        Effect.orDie
    )
);

const disconnect = FunctionImpl.make(
    databaseSchema,
    spec,
    "disconnect",
    Effect.fn("Notion.disconnect")(
        function* disconnect() {
            const userId = yield* actionUserId();
            const token = yield* accessToken(userId).pipe(Effect.option);
            const config = yield* notionConfig;
            if (Option.isSome(token) && Option.isSome(config)) {
                yield* revokeToken(token.value, config.value.clientId, config.value.clientSecret).pipe(
                    Effect.provide(outboundHttp),
                    Effect.catchTags({ NotionError: (error) => Console.error(error.message, error.cause) })
                );
            }
            yield* forgetConnection(userId);
            return null;
        },
        Effect.catchTags({ Unauthenticated: refusals.Unauthenticated }),
        Effect.orDie
    )
);

const forget = FunctionImpl.make(
    databaseSchema,
    spec,
    "forget",
    Effect.fn("Notion.forget")(function* forget(args) {
        const ctx = yield* MutationCtx;
        // SAFETY: as in `deleteAuthRows` (`accountDeletion.impl.ts`); one page clears a user's single Notion link.
        yield* Effect.promise(() =>
            ctx.runMutation(
                components.betterAuth.adapter.deleteMany as never,
                {
                    input: { model: "account", where: notionAccountWhere(args.userId) },
                    paginationOpts: { cursor: null, numItems: NOTION_ACCOUNT_PAGE },
                } as never
            )
        );
        return null;
    }, Effect.orDie)
);

const revoke = FunctionImpl.make(
    databaseSchema,
    spec,
    "revoke",
    Effect.fn("Notion.revoke")(function* revoke(args) {
        const config = yield* notionConfig;
        if (Option.isNone(config)) {
            return null;
        }
        const ctx = yield* ActionCtx;
        const token = yield* Effect.promise(() => decryptStoredToken(ctx, args.accessToken));
        yield* revokeToken(Redacted.make(token), config.value.clientId, config.value.clientSecret).pipe(
            Effect.provide(outboundHttp),
            Effect.catchTags({ NotionError: (error) => Console.error(error.message, error.cause) })
        );
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(connected),
    Layer.provide(sources),
    Layer.provide(tables),
    Layer.provide(disconnect),
    Layer.provide(forget),
    Layer.provide(revoke),
    GroupImpl.finalize
);
