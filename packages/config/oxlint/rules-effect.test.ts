import { describe, expect, it } from "vite-plus/test";

import { lint } from "./test-harness";

const messages = (diagnostics: { message: string }[]) => diagnostics.map(({ message }) => message);
const MESSAGE =
    'Use Effect.fn("Module.operation") for reusable Effect functions. Reserve Effect.fnUntraced for documented hot paths or an existing span; keep Effect.gen for inline programs.';

describe("prefer-effect-fn", () => {
    const effectFn = (source: string) => lint("prefer-effect-fn", "packages/money/src/rates.ts", source);

    it("reports a reusable arrow that only returns Effect.gen", () => {
        const source = `import { Effect } from "effect";
export const load = () => Effect.gen(function* () {
    return 1;
});
`;
        expect(messages(effectFn(source))).toStrictEqual([MESSAGE]);
    });

    it("reports a reusable function declaration that only returns Effect.gen", () => {
        const source = `import { Effect } from "effect";
export function load() {
    return Effect.gen(function* () {
        return 1;
    });
}
`;
        expect(messages(effectFn(source))).toStrictEqual([MESSAGE]);
    });

    it("allows a longer body, another combinator, and an inline program", () => {
        const source = `import { Effect } from "effect";
export const plain = () => Effect.succeed(1);
export function withSetup() {
    const seed = 1;
    return Effect.gen(function* () {
        return seed;
    });
}
export const program = Effect.runPromise(Effect.gen(function* () { return 1; }));
`;
        expect(effectFn(source)).toStrictEqual([]);
    });
});

describe("prefer-catch-tags", () => {
    const catchTags = (source: string) => lint("prefer-catch-tags", "packages/money/src/rates.ts", source);

    it("reports a catchTag import", () => {
        expect(
            messages(catchTags('import { catchTag } from "effect/Effect";\nexport const handler = catchTag;\n'))
        ).toStrictEqual(["Catch known tags with `Effect.catchTags({ Tag: handler })`, even for one tag."]);
    });

    it("reports catchTag called through the Effect namespace", () => {
        const source = `import * as Effect from "effect/Effect";
export const guard = (effect) => Effect.catchTag(effect, "Rate")(() => 1);
`;
        expect(messages(catchTags(source))).toStrictEqual([
            "Catch known tags with `Effect.catchTags({ Tag: handler })`, even for one tag.",
        ]);
    });

    it("allows catchTags and a namespace from another module", () => {
        const source = `import { catchTags } from "effect/Effect";
import * as Other from "effect";
export const handler = catchTags;
export const guard = (effect) => Other.catchTag(effect, "Rate")(() => 1);
`;
        expect(catchTags(source)).toStrictEqual([]);
    });
});

describe("no-inline-schema-compile", () => {
    const schema = (source: string) => lint("no-inline-schema-compile", "packages/money/src/person.ts", source);

    it("reports a decoder compiled inside a function", () => {
        const source = `import * as Schema from "effect/Schema";
const Person = Schema.Struct({ name: Schema.String });
export function parse(input) {
    return Schema.decodeUnknownSync(Person)(input);
}
`;
        expect(messages(schema(source))).toStrictEqual([
            "Hoist Schema.decodeUnknownSync(...) to module scope: the compiled function is rebuilt on every call. Move it to a module-level const.",
        ]);
    });

    it("reports an inline schema literal nested in the decoder", () => {
        const source = `import * as Schema from "effect/Schema";
const Person = Schema.Struct({ name: Schema.String });
export function parse(input) {
    return Schema.decodeUnknownSync(Schema.fromJsonString(Person))(input);
}
`;
        expect(messages(schema(source))).toStrictEqual([
            "Hoist Schema.decodeUnknownSync(...) to module scope: both the inline schema literal and the compiled function are rebuilt on every call. Move the compiled function to a module-level const.",
        ]);
    });

    it("allows module-scope compiles and decoders inside a function that are not invoked", () => {
        const source = `import * as Schema from "effect/Schema";
const Person = Schema.Struct({ name: Schema.String });
const decode = Schema.decodeUnknownSync(Person);
export function parse(input) {
    const cached = Schema.decodeUnknownSync(Person);
    return cached(input) ?? Schema.decodeUnknownSync(schema)(input);
}
`;
        expect(schema(source)).toStrictEqual([]);
    });
});
