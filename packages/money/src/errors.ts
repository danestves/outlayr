import * as Schema from "effect/Schema";

export class MoneyValidationError extends Schema.TaggedError<MoneyValidationError>()("MoneyValidationError", {
    message: Schema.String,
}) {}
