import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { internal } from "../convex/_generated/api";
import type { ActionCtx } from "../convex/_generated/server";
import { sha256Hex } from "./lib/sha256Hex";
import type { InboundWrite } from "./tables/inboundWrites";

const MAX_BODY_LENGTH = 8000;
const BEARER = /^Bearer\s+([A-Za-z0-9_-]{32,128})$/;
const MAX_AMOUNT = 1e12;

const Text = (max: number) => Schema.String.check(Schema.isMaxLength(max));

const InboundBody = Schema.Struct({
    amount: Schema.Finite.check(Schema.isGreaterThan(0)),
    card: Schema.optional(Text(64)),
    category: Schema.optional(Text(64)),
    currency: Schema.optional(Schema.String.check(Schema.isPattern(/^[A-Za-z]{3}$/))),
    date: Schema.optional(Schema.Union([Schema.Finite, Text(40)])),
    dedupeKey: Schema.optional(Text(128)),
    income: Schema.optional(Schema.Boolean),
    note: Schema.optional(Text(200)),
    text: Schema.optional(Text(1000)),
});

const decodeBody = Schema.decodeUnknownOption(Schema.fromJsonString(InboundBody));

type ReceiveCtx = Pick<ActionCtx, "runMutation">;

const instant = (date: number | string | undefined, now: number) => {
    const at = new Date(date ?? now).getTime();
    return Number.isFinite(at) ? Option.some(at) : Option.none();
};

export function parseInbound(text: string, now: number): Option.Option<typeof InboundWrite.Type> {
    const body = text.length > MAX_BODY_LENGTH ? Option.none() : decodeBody(text);
    if (Option.isNone(body) || body.value.amount > MAX_AMOUNT) {
        return Option.none();
    }
    const { currency, date, income, note, ...rest } = body.value;
    return Option.map(instant(date, now), (at) => ({
        ...rest,
        ...(currency !== undefined && { currency: currency.toUpperCase() }),
        date: at,
        income: income ?? false,
        note: note?.trim() ?? "",
    }));
}

type Reply = { error: string } | { id: string };

const reply = (status: number, body: Reply) => Response.json(body, { status });

const REFUSED = {
    full: [429, "inbox_full"],
    refused: [403, "pro_required"],
    unknownToken: [401, "unauthorized"],
} as const;

// Content-Length is optional on a chunked request, so the cap holds while reading.
async function readCapped(request: Request): Promise<string | null> {
    if (request.body === null) {
        return "";
    }
    const chunks: Uint8Array[] = [];
    const size = await readChunks(request.body.getReader(), chunks, 0);
    return size === null ? null : new TextDecoder().decode(concatBytes(chunks, size));
}

async function readChunks(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    chunks: Uint8Array[],
    size: number
): Promise<number | null> {
    const { done, value } = await reader.read();
    if (done) {
        return size;
    }
    const next = size + value.byteLength;
    if (next > MAX_BODY_LENGTH) {
        await reader.cancel();
        return null;
    }
    chunks.push(value);
    return await readChunks(reader, chunks, next);
}

function concatBytes(chunks: readonly Uint8Array[], size: number): Uint8Array {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return bytes;
}

export const receiveInbound = Effect.fn("Webhooks.receiveInbound")(function* receiveInbound(
    ctx: ReceiveCtx,
    request: Request
) {
    const token = BEARER.exec(request.headers.get("Authorization") ?? "")?.[1];
    if (token === undefined) {
        return reply(401, { error: "unauthorized" });
    }
    if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_LENGTH) {
        return reply(413, { error: "too_large" });
    }
    const text = yield* Effect.promise(() => readCapped(request));
    if (text === null) {
        return reply(413, { error: "too_large" });
    }
    const write = parseInbound(text, yield* Clock.currentTimeMillis);
    if (Option.isNone(write)) {
        return reply(400, { error: "invalid_body" });
    }
    const tokenHash = yield* sha256Hex(token);
    const received = yield* Effect.promise(() =>
        ctx.runMutation(internal.webhooks.receive, { tokenHash, write: write.value })
    );
    if (received.kind === "queued") {
        return reply(202, { id: received.id });
    }
    const [status, error] = REFUSED[received.kind];
    return reply(status, { error });
});
