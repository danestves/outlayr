import { Table } from "@confect/core";
import { LANGUAGES } from "@outlayr/email/language";
import * as Schema from "effect/Schema";

export const Notice = Schema.Struct({
    keys: Schema.Array(Schema.String),
    language: Schema.Literals(LANGUAGES),
    userId: Schema.String,
});

export const OutboundEmail = Schema.Struct({
    html: Schema.optional(Schema.String),
    notice: Schema.optional(Notice),
    replyTo: Schema.optional(Schema.String),
    subject: Schema.String,
    text: Schema.String,
    to: Schema.String,
});

export default Table.make(() => OutboundEmail);
