import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2026-03-11";
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT = Duration.seconds(30);
export const NOTION_PROVIDER_ID = "notion";
export const MAX_NOTION_ROWS = 10_000;

export class NotionError extends Schema.TaggedError<NotionError>()("NotionError", {
    cause: Schema.optional(Schema.Defect()),
    reason: Schema.Literals(["transport", "status", "contract", "revoked", "rateLimited"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        if (this.reason === "status") {
            return `Notion request failed with HTTP ${this.status}`;
        }
        if (this.reason === "contract") {
            return "Notion response did not match the expected shape";
        }
        if (this.reason === "revoked") {
            return "Notion access was revoked";
        }
        if (this.reason === "rateLimited") {
            return "Notion rate limit reached";
        }
        return "Notion request failed";
    }
}

export class NotionNotConnected extends Schema.TaggedError<NotionNotConnected>()("NotionNotConnected", {
    message: Schema.String.pipe(Schema.withConstructorDefault(Effect.succeed("Notion is not connected"))),
}) {}

const PlainText = Schema.Array(Schema.Struct({ plain_text: Schema.String }));
const Named = Schema.Struct({ name: Schema.String });
const DateValue = Schema.Struct({ start: Schema.String });

const PropertyValue = Schema.Union([
    Schema.Struct({ title: PlainText, type: Schema.Literal("title") }),
    Schema.Struct({ rich_text: PlainText, type: Schema.Literal("rich_text") }),
    Schema.Struct({ number: Schema.NullOr(Schema.Number), type: Schema.Literal("number") }),
    Schema.Struct({ date: Schema.NullOr(DateValue), type: Schema.Literal("date") }),
    Schema.Struct({ select: Schema.NullOr(Named), type: Schema.Literal("select") }),
    Schema.Struct({ status: Schema.NullOr(Named), type: Schema.Literal("status") }),
    Schema.Struct({ multi_select: Schema.Array(Named), type: Schema.Literal("multi_select") }),
    Schema.Struct({ checkbox: Schema.Boolean, type: Schema.Literal("checkbox") }),
    Schema.Struct({ type: Schema.Literal("url"), url: Schema.NullOr(Schema.String) }),
    Schema.Struct({ email: Schema.NullOr(Schema.String), type: Schema.Literal("email") }),
    Schema.Struct({ phone_number: Schema.NullOr(Schema.String), type: Schema.Literal("phone_number") }),
    Schema.Struct({ created_time: Schema.String, type: Schema.Literal("created_time") }),
    Schema.Struct({ relation: Schema.Array(Schema.Struct({ id: Schema.String })), type: Schema.Literal("relation") }),
    Schema.Struct({
        formula: Schema.Struct({
            boolean: Schema.optional(Schema.NullOr(Schema.Boolean)),
            date: Schema.optional(Schema.NullOr(DateValue)),
            number: Schema.optional(Schema.NullOr(Schema.Number)),
            string: Schema.optional(Schema.NullOr(Schema.String)),
        }),
        type: Schema.Literal("formula"),
    }),
    Schema.Struct({
        rollup: Schema.Struct({
            array: Schema.optional(Schema.Array(Schema.Unknown)),
            date: Schema.optional(Schema.NullOr(DateValue)),
            number: Schema.optional(Schema.NullOr(Schema.Number)),
        }),
        type: Schema.Literal("rollup"),
    }),
    Schema.Struct({ type: Schema.String }),
]);
type PropertyValue = typeof PropertyValue.Type;

const decodePropertyValue = Schema.decodeUnknownOption(PropertyValue);

const PropertySchema = Schema.Struct({
    relation: Schema.optional(Schema.Struct({ data_source_id: Schema.optional(Schema.String) })),
    type: Schema.String,
});

const DataSource = Schema.Struct({
    id: Schema.String,
    object: Schema.Literal("data_source"),
    properties: Schema.Record(Schema.String, PropertySchema),
    title: Schema.optional(PlainText),
});
export type NotionDataSource = typeof DataSource.Type;

const Page = Schema.Struct({
    id: Schema.String,
    object: Schema.Literal("page"),
    properties: Schema.Record(Schema.String, PropertyValue),
});
type Page = typeof Page.Type;

const listOf = <A, I, RD, RE>(item: Schema.Codec<A, I, RD, RE>) =>
    Schema.Struct({
        has_more: Schema.Boolean,
        next_cursor: Schema.NullOr(Schema.String),
        results: Schema.Array(Schema.Union([item, Schema.Struct({ object: Schema.String })])),
    });

const SearchResponse = listOf(DataSource);
const QueryResponse = listOf(Page);
const BotUser = Schema.Struct({
    bot: Schema.Struct({ workspace_name: Schema.optional(Schema.NullOr(Schema.String)) }),
});

const transport = (cause: unknown) => new NotionError({ cause, reason: "transport" });

const send = Effect.fn("Notion.send")(
    function* send<A, I, RD>(request: HttpClientRequest.HttpClientRequest, schema: Schema.Codec<A, I, RD>) {
        const response = yield* HttpClient.execute(
            request.pipe(HttpClientRequest.setHeader("Notion-Version", NOTION_VERSION))
        ).pipe(Effect.catchTags({ HttpClientError: transport }));
        if (response.status === 401) {
            return yield* new NotionError({ reason: "revoked", status: 401 });
        }
        if (response.status === 429) {
            return yield* new NotionError({ reason: "rateLimited", status: 429 });
        }
        if (response.status < 200 || response.status >= 300) {
            return yield* new NotionError({ reason: "status", status: response.status });
        }
        return yield* HttpIncomingMessage.schemaBodyJson(schema)(response).pipe(
            Effect.catchTags({
                HttpClientError: transport,
                SchemaError: (cause) => new NotionError({ cause, reason: "contract" }),
            })
        );
    },
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.catchTags({ TimeoutError: transport }),
    Effect.retry({
        schedule: Schedule.exponential(Duration.seconds(1)),
        times: 3,
        while: (error) => error.reason === "rateLimited",
    })
);

interface PageRequest {
    filter?: { property: "object"; value: "data_source" };
    page_size: number;
    start_cursor?: string;
}

function pageRequest(cursor: string | null, filter?: PageRequest["filter"]): PageRequest {
    const body: PageRequest = { page_size: PAGE_SIZE };
    if (filter !== undefined) {
        body.filter = filter;
    }
    if (cursor !== null) {
        body.start_cursor = cursor;
    }
    return body;
}

const authorized = (request: HttpClientRequest.HttpClientRequest, token: Redacted.Redacted) =>
    request.pipe(HttpClientRequest.bearerToken(Redacted.value(token)));

export const workspaceName = Effect.fn("Notion.workspaceName")(function* workspaceName(token: Redacted.Redacted) {
    const me = yield* send(authorized(HttpClientRequest.get(`${NOTION_API}/users/me`), token), BotUser);
    return me.bot.workspace_name ?? null;
});

export const searchDataSources = Effect.fn("Notion.searchDataSources")(function* searchDataSources(
    token: Redacted.Redacted
) {
    const found: NotionDataSource[] = [];
    let cursor: string | null = null;
    do {
        const page: typeof SearchResponse.Type = yield* send(
            authorized(HttpClientRequest.post(`${NOTION_API}/search`), token).pipe(
                HttpClientRequest.bodyJsonUnsafe(pageRequest(cursor, { property: "object", value: "data_source" }))
            ),
            SearchResponse
        );
        found.push(...page.results.filter((result): result is NotionDataSource => result.object === "data_source"));
        cursor = page.has_more ? page.next_cursor : null;
    } while (cursor !== null);
    return found;
});

export const getDataSource = Effect.fn("Notion.getDataSource")(function* getDataSource(
    token: Redacted.Redacted,
    id: string
) {
    return yield* send(
        authorized(HttpClientRequest.get(`${NOTION_API}/data_sources/${encodeURIComponent(id)}`), token),
        DataSource
    );
});

export const queryPages = Effect.fn("Notion.queryPages")(function* queryPages(token: Redacted.Redacted, id: string) {
    const pages: Page[] = [];
    let cursor: string | null = null;
    do {
        const page: typeof QueryResponse.Type = yield* send(
            authorized(
                HttpClientRequest.post(`${NOTION_API}/data_sources/${encodeURIComponent(id)}/query`),
                token
            ).pipe(HttpClientRequest.bodyJsonUnsafe(pageRequest(cursor))),
            QueryResponse
        );
        pages.push(...page.results.filter((result): result is Page => result.object === "page"));
        cursor = page.has_more && pages.length < MAX_NOTION_ROWS ? page.next_cursor : null;
    } while (cursor !== null);
    return pages.slice(0, MAX_NOTION_ROWS);
});

export const revokeToken = Effect.fn("Notion.revokeToken")(function* revokeToken(
    token: Redacted.Redacted,
    clientId: string,
    clientSecret: Redacted.Redacted
) {
    yield* send(
        HttpClientRequest.post(`${NOTION_API}/oauth/revoke`).pipe(
            HttpClientRequest.basicAuth(clientId, Redacted.value(clientSecret)),
            HttpClientRequest.bodyJsonUnsafe({ token: Redacted.value(token) })
        ),
        Schema.Unknown
    );
});

const plain = (parts: readonly { plain_text: string }[]) => parts.map((part) => part.plain_text).join("");

function dateText(value: { start: string } | null | undefined): string {
    if (value == null) {
        return "";
    }
    const [day, time] = value.start.split("T");
    return time === undefined ? (day ?? "") : `${day} ${time.slice(0, 8)}`;
}

function cellText(value: PropertyValue, relationTitles: ReadonlyMap<string, string>): string {
    if ("title" in value) {
        return plain(value.title);
    }
    if ("rich_text" in value) {
        return plain(value.rich_text);
    }
    if ("number" in value) {
        return value.number == null ? "" : String(value.number);
    }
    if ("date" in value) {
        return dateText(value.date);
    }
    if ("select" in value) {
        return value.select?.name ?? "";
    }
    if ("status" in value) {
        return value.status?.name ?? "";
    }
    if ("multi_select" in value) {
        return value.multi_select.map((option) => option.name).join(", ");
    }
    if ("checkbox" in value) {
        return value.checkbox ? "true" : "false";
    }
    if ("url" in value) {
        return value.url ?? "";
    }
    if ("email" in value) {
        return value.email ?? "";
    }
    if ("phone_number" in value) {
        return value.phone_number ?? "";
    }
    if ("created_time" in value) {
        return dateText({ start: value.created_time });
    }
    if ("relation" in value) {
        return value.relation.map((link) => relationTitles.get(link.id) ?? "").join(", ");
    }
    if ("formula" in value) {
        const { boolean, date, number, string } = value.formula;
        if (number != null) {
            return String(number);
        }
        if (date != null) {
            return dateText(date);
        }
        return string ?? (boolean == null ? "" : String(boolean));
    }
    if ("rollup" in value) {
        const { array, date, number } = value.rollup;
        if (number != null) {
            return String(number);
        }
        if (date != null) {
            return dateText(date);
        }
        return (array ?? [])
            .flatMap((item) => Option.toArray(decodePropertyValue(item)))
            .map((item) => cellText(item, relationTitles))
            .join(", ");
    }
    return "";
}

export function columnNames(source: NotionDataSource): string[] {
    const names = Object.keys(source.properties);
    return names.toSorted(
        (a, b) => Number(source.properties[b]?.type === "title") - Number(source.properties[a]?.type === "title")
    );
}

export function tableRows(
    columns: readonly string[],
    pages: readonly Page[],
    relationTitles: ReadonlyMap<string, string>
): string[][] {
    return pages.map((page) =>
        columns.map((column) => {
            const value = page.properties[column];
            return value === undefined ? "" : cellText(value, relationTitles);
        })
    );
}

export function pageTitle(page: Page): string {
    for (const value of Object.values(page.properties)) {
        if ("title" in value) {
            return plain(value.title);
        }
    }
    return "";
}

export function looksLikeLedger(source: NotionDataSource): boolean {
    const types = Object.values(source.properties).map((property) => property.type);
    return types.includes("date") && (types.includes("number") || types.includes("formula"));
}

export function relationSources(source: NotionDataSource): string[] {
    return [
        ...new Set(
            Object.values(source.properties).flatMap((property) =>
                property.type === "relation" && property.relation?.data_source_id !== undefined
                    ? [property.relation.data_source_id]
                    : []
            )
        ),
    ];
}

export function sourceTitle(source: NotionDataSource): string {
    return plain(source.title ?? []);
}
