import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { MAX_AMOUNT } from "./lib/sanitizeLimits";
import { sha256Hex } from "./lib/sha256Hex";
import { EntryKind, localDate } from "./mcpLedger";

export const MCP_DEVICE_ID = "mcp";

export const MEMORY_WINDOW = 500;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const LogEntryInput = {
    account: Schema.optional(Schema.String),
    amount: Schema.Number,
    category: Schema.optional(Schema.String),
    currency: Schema.optional(Schema.String),
    date: Schema.optional(Schema.String),
    idempotencyKey: Schema.optional(Schema.String),
    kind: EntryKind,
    note: Schema.optional(Schema.String),
};

export const LoggedEntry = Schema.Struct({
    account: Schema.NullOr(Schema.String),
    amount: Schema.Number,
    category: Schema.NullOr(Schema.String),
    currency: Schema.String,
    date: Schema.String,
    kind: EntryKind,
    note: Schema.String,
});

export const fold = (name: string) => name.trim().toLowerCase();

export const choicesOf = (rows: readonly { name: string | null }[]) => [
    ...new Set(rows.flatMap((row) => (row.name ? [row.name] : []))),
];

const choiceHint = (choices: readonly string[]) => `Use one of: ${choices.join(", ") || "none"}.`;

export class EntryNeedsPro extends Schema.TaggedError<EntryNeedsPro>()("EntryNeedsPro", {
    message: Schema.String.pipe(
        Schema.withConstructorDefault(
            Effect.succeed(
                "Adding entries needs Outlayr Pro: only Pro syncs, so the user's devices would never receive it."
            )
        )
    ),
}) {}

export class UnknownCurrency extends Schema.TaggedError<UnknownCurrency>()("UnknownCurrency", {
    currency: Schema.String,
}) {
    override get message(): string {
        return `"${this.currency}" is not a currency Outlayr knows. Use an ISO 4217 code such as USD.`;
    }
}

export class InvalidAmount extends Schema.TaggedError<InvalidAmount>()("InvalidAmount", {
    reason: Schema.Literals(["notANumber", "tooLarge", "zero"]),
}) {
    override get message(): string {
        return {
            notANumber: "amount must be a number.",
            tooLarge: `amount must be at most ${MAX_AMOUNT.toLocaleString("en-US")}.`,
            zero: "amount must not be zero.",
        }[this.reason];
    }
}

export class AmbiguousName extends Schema.TaggedError<AmbiguousName>()("AmbiguousName", {
    label: Schema.String,
    wanted: Schema.String,
}) {
    override get message(): string {
        return `More than one ${this.label} is named "${this.wanted}". Ask the user to rename one in Outlayr.`;
    }
}

export class UnknownName extends Schema.TaggedError<UnknownName>()("UnknownName", {
    choices: Schema.Array(Schema.String),
    label: Schema.String,
    wanted: Schema.String,
}) {
    override get message(): string {
        return `No ${this.label} is named "${this.wanted}". ${choiceHint(this.choices)}`;
    }
}

export class CategoryRequired extends Schema.TaggedError<CategoryRequired>()("CategoryRequired", {
    choices: Schema.Array(Schema.String),
    kind: EntryKind,
}) {
    override get message(): string {
        return `Pass a category for this ${this.kind}. ${choiceHint(this.choices)}`;
    }
}

export class InvalidDate extends Schema.TaggedError<InvalidDate>()("InvalidDate", { date: Schema.String }) {
    override get message(): string {
        return `date must be a calendar day as YYYY-MM-DD; got "${this.date}".`;
    }
}

export class IdempotencyKeyReused extends Schema.TaggedError<IdempotencyKeyReused>()("IdempotencyKeyReused", {
    message: Schema.String.pipe(
        Schema.withConstructorDefault(Effect.succeed("This idempotencyKey was already used for a different entry."))
    ),
}) {}

export function named<T extends { name: string | null }>(
    rows: readonly T[],
    wanted: string,
    label: string
): Effect.Effect<T, AmbiguousName | UnknownName> {
    const matches = rows.filter((row) => row.name !== null && fold(row.name) === fold(wanted));
    const [match] = matches;
    if (matches.length === 1 && match) {
        return Effect.succeed(match);
    }
    if (matches.length > 1) {
        return Effect.fail(new AmbiguousName({ label, wanted }));
    }
    return Effect.fail(new UnknownName({ choices: choicesOf(rows), label, wanted }));
}

export function entryInstant(
    date: string | undefined,
    now: number,
    offsetMs: number
): Effect.Effect<number, InvalidDate> {
    const wanted = date?.trim();
    if (!wanted || wanted === localDate(now, offsetMs)) {
        return Effect.succeed(now);
    }
    const noon = Date.parse(`${wanted}T12:00:00Z`);
    if (!ISO_DATE.test(wanted) || Number.isNaN(noon) || localDate(noon, 0) !== wanted) {
        return Effect.fail(new InvalidDate({ date: wanted }));
    }
    return Effect.succeed(noon - offsetMs);
}

export function localMidnights(instant: number, offsetMs: number) {
    const local = new Date(instant + offsetMs);
    return {
        day: Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs,
        month: Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offsetMs,
    };
}

export const keyedLocalId = Effect.fn("McpEntries.keyedLocalId")(function* keyedLocalId(userId: string, key: string) {
    const hex = yield* sha256Hex(`${userId}:${key}`);
    const variant = ((Number.parseInt(hex.charAt(16), 16) % 4) + 8).toString(16);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
});
