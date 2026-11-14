import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const Param = Schema.UndefinedOr(Schema.String).pipe(
    Schema.catchDecoding(() => Effect.succeed(Option.some(undefined)))
);

export const importSearch = Schema.toStandardSchemaV1(
    Schema.Struct({ kind: Schema.optional(Param), tab: Schema.optional(Param) })
);
