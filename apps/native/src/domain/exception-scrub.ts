import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const QUERY_PARAMS = /\nparams: [\s\S]*$/u;
const URL_QUERY = /(?<url>\b[a-z][\d+.a-z-]*:[^\s?]+)\?\S*/giu;

const decodeExceptionList = Schema.decodeUnknownOption(
    Schema.Array(
        Schema.StructWithRest(Schema.Struct({ value: Schema.optional(Schema.String) }), [
            Schema.Record(
                Schema.String,
                Schema.declare((_value: unknown): _value is Schema.MutableJson => true)
            ),
        ])
    )
);

export function scrubQueryParams<Event extends { properties?: Record<string, Schema.MutableJson> }>(
    event: Event | null
): Event | null {
    const properties = event?.properties;
    const exceptions = decodeExceptionList(properties?.$exception_list);
    if (properties === undefined || Option.isNone(exceptions)) {
        return event;
    }
    properties.$exception_list = exceptions.value.map(({ value, ...rest }) =>
        value === undefined ? rest : { ...rest, value: value.replace(QUERY_PARAMS, "").replaceAll(URL_QUERY, "$<url>") }
    );
    return event;
}
