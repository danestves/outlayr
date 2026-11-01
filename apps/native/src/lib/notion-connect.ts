import { api } from "@outlayr/backend/convex/_generated/api";
import { ConvexError } from "convex/values";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { csvFromNotionTables } from "@/domain/import-archive";

import { authClient } from "./auth-client";
import type { CloudError } from "./cloud-error";
import { cloudAction, cloudQuery } from "./convex";

const NOTION_CALLBACK_PATH = "/import";

export const NotionFailure = Schema.Literals([
    "notConnected",
    "proRequired",
    "rateLimited",
    "revoked",
    "signedOut",
    "unavailable",
]);
export type NotionFailure = typeof NotionFailure.Type;

export class NotionConnectError extends Schema.TaggedError<NotionConnectError>()("NotionConnectError", {
    cause: Schema.optional(Schema.Defect()),
    reason: NotionFailure,
}) {}

const CODES = new Map<string, NotionFailure>([
    ["NOTION_NOT_CONNECTED", "notConnected"],
    ["NOTION_RATE_LIMITED", "rateLimited"],
    ["NOTION_REVOKED", "revoked"],
    ["NOTION_UNAVAILABLE", "unavailable"],
    ["PRO_REQUIRED", "proRequired"],
    ["UNAUTHENTICATED", "signedOut"],
]);

const decodeCode = Schema.decodeUnknownOption(Schema.Struct({ code: Schema.String }));

export function notionFailure(error: CloudError): NotionConnectError {
    const { cause } = error;
    const reason =
        cause instanceof ConvexError
            ? decodeCode(cause.data).pipe(Option.flatMapNullishOr((data) => CODES.get(data.code)))
            : Option.none();
    return new NotionConnectError({ cause, reason: Option.getOrElse(reason, () => "unavailable" as const) });
}

export const isNotionConnected = Effect.fn("Notion.isConnected")(function* isNotionConnected() {
    return yield* cloudQuery(api.notion.connected, {}).pipe(Effect.mapError(notionFailure));
});

export const connectNotion = Effect.fn("Notion.connect")(function* connectNotion() {
    if (authClient === null) {
        return yield* new NotionConnectError({ reason: "signedOut" });
    }
    const client = authClient;
    yield* Effect.tryPromise({
        catch: (cause) => new NotionConnectError({ cause, reason: "unavailable" }),
        try: () => client.linkSocial({ callbackURL: NOTION_CALLBACK_PATH, provider: "notion" }),
    });
    return yield* isNotionConnected();
});

export const notionSources = Effect.fn("Notion.sources")(function* notionSources() {
    return yield* cloudAction(api.notion.sources, {}).pipe(Effect.mapError(notionFailure));
});

export const notionCsv = Effect.fn("Notion.csv")(function* notionCsv(ids: readonly string[]) {
    const tables = yield* cloudAction(api.notion.tables, { ids: [...ids] }).pipe(Effect.mapError(notionFailure));
    return { csv: csvFromNotionTables(tables), truncated: tables.some((table) => table.truncated) };
});

export const disconnectNotion = Effect.fn("Notion.disconnect")(function* disconnectNotion() {
    yield* cloudAction(api.notion.disconnect, {}).pipe(Effect.mapError(notionFailure));
});
