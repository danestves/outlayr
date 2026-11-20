import * as Schema from "effect/Schema";
import { expect, test } from "vite-plus/test";

import { closedJsonSchema } from "./generate";

const openObjects = (node: unknown): number => {
    if (typeof node !== "object" || node === null) {
        return 0;
    }
    const own =
        "properties" in node && !("additionalProperties" in node && node.additionalProperties === false) ? 1 : 0;
    return own + Object.values(node).reduce<number>((total, child) => total + openObjects(child), 0);
};

test("closes every object, since Anthropic rejects structured output schemas that allow extra keys", () => {
    const Line = Schema.Struct({ amount: Schema.Finite, name: Schema.String }).annotate({ identifier: "Line" });
    const Receipt = Schema.Struct({
        debt: Schema.NullOr(Schema.Struct({ verb: Schema.Literals(["lent", "borrowed"]) })),
        lines: Schema.Array(Line),
        total: Schema.Finite,
    });

    const schema = closedJsonSchema(Receipt);

    expect(openObjects(schema)).toBe(0);
    expect(JSON.stringify(schema)).not.toContain("#/definitions/");
});
