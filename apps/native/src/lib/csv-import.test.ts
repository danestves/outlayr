import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { describe, expect, it, vi } from "vite-plus/test";

import { categoryKey } from "@/data/transfer-core";
import type { ColumnMapping, ParsedImportFile } from "@/data/transfer-core";
import type { ImportFlowEvent } from "@/domain/import-flow";
import type { CsvImportFn, CsvImportOutcome } from "@/lib/cloud-ai";

import * as CsvImport from "./csv-import";
import { createImportDraftStore } from "./import-draft-store";

const FOOD_ID = "cat-food";

const MAPPING: ColumnMapping = {
    amount: 1,
    category: 2,
    currency: null,
    date: 0,
    exchangeRate: null,
    exchangeRateType: null,
    note: null,
    type: null,
};

function parsedFile(label: string): ParsedImportFile {
    return { header: ["date", "amount", "category"], rows: [["2026-08-01", "3.50", label]], width: 3 };
}

function fileParsed(parsed: ParsedImportFile, name: string): ImportFlowEvent {
    return {
        draft: MAPPING,
        file: { chars: 40, name },
        gaps: [],
        parsed,
        resolved: { labelSource: "categoryColumn", mapping: MAPPING },
        type: "fileParsed",
    };
}

function openDraft(parsed: ParsedImportFile) {
    const store = createImportDraftStore();
    store.dispatch({ sourceId: "csv", type: "sourceSelected" });
    store.dispatch(fileParsed(parsed, "bank.csv"));
    return store;
}

function requestFor(parsed: ParsedImportFile, overrides: Partial<CsvImport.ResolveRequest> = {}) {
    return {
        aiEnrichment: true,
        categoryIdByKey: new Map([[categoryKey("Food"), FOOD_ID]]),
        categoryTree: [{ children: [], name: "Food" }],
        chars: 40,
        draft: MAPPING,
        groundedLookup: false,
        labels: parsed.rows.map((row) => row[2] ?? ""),
        parsed,
        regionCode: undefined,
        ...overrides,
    } satisfies CsvImport.ResolveRequest;
}

function held() {
    const { promise, resolve } = Promise.withResolvers<CsvImportOutcome>();
    return { promise, resolve };
}

const answered = (label: string): CsvImportOutcome => ({
    ok: true,
    suggestions: [{ categoryName: "Food", domain: null, label }],
});

function withService<A>(
    transport: CsvImportFn | null,
    store: ReturnType<typeof createImportDraftStore>,
    program: Effect.Effect<A, never, CsvImport.CsvImport>
) {
    const layer = CsvImport.layer.pipe(
        Layer.provide(
            Layer.mergeAll(
                Layer.succeed(CsvImport.CsvImportTransport, transport),
                Layer.succeed(CsvImport.CsvImportDraft, store)
            )
        ),
        Layer.merge(Logger.layer([]))
    );
    return Effect.runPromise(program.pipe(Effect.provide(layer)));
}

const untilSettled = Effect.gen(function* untilSettled() {
    const { state } = yield* CsvImport.CsvImport;
    return yield* SubscriptionRef.changes(state).pipe(
        Stream.filter((next) => next.stage === "settled"),
        Stream.runHead
    );
});

describe("csvImport", () => {
    it("settles a run once into the draft with its links, outcome and reason", async () => {
        const parsed = parsedFile("Zq Cafe");
        const store = openDraft(parsed);
        const transport = vi.fn<CsvImportFn>().mockReturnValue(Effect.succeed(answered("Zq Cafe")));
        const writes = vi.fn();
        store.subscribe(writes);

        await withService(
            transport,
            store,
            Effect.gen(function* run() {
                const csvImport = yield* CsvImport.CsvImport;
                yield* csvImport.run(requestFor(parsed));
                yield* untilSettled;
            })
        );

        expect(store.getSnapshot().flow.resolution).toStrictEqual({
            fromModel: new Set([categoryKey("Zq Cafe")]),
            links: new Map([[categoryKey("Zq Cafe"), FOOD_ID]]),
            outcome: "applied",
            reason: null,
        });
        expect(writes).toHaveBeenCalledOnce();
    });

    it("runs once for a file however often it is started, and again only on retry", async () => {
        const parsed = parsedFile("Zq Cafe");
        const store = openDraft(parsed);
        const transport = vi.fn<CsvImportFn>().mockReturnValue(Effect.succeed(answered("Zq Cafe")));

        await withService(
            transport,
            store,
            Effect.gen(function* run() {
                const csvImport = yield* CsvImport.CsvImport;
                yield* csvImport.run(requestFor(parsed));
                yield* csvImport.run(requestFor(parsed));
                yield* untilSettled;
                yield* csvImport.run(requestFor(parsed));
                expect(transport).toHaveBeenCalledOnce();

                yield* csvImport.retry(requestFor(parsed));
                yield* untilSettled;
            })
        );

        expect(transport).toHaveBeenCalledTimes(2);
    });

    it("discards the answer of a run whose file was replaced", async () => {
        const first = parsedFile("Zq Cafe");
        const second = parsedFile("Other Place");
        const store = openDraft(first);
        const answer = held();
        const transport = vi.fn<CsvImportFn>().mockReturnValueOnce(Effect.promise(() => answer.promise));

        await withService(
            transport,
            store,
            Effect.gen(function* run() {
                const csvImport = yield* CsvImport.CsvImport;
                yield* csvImport.run(requestFor(first));
                store.dispatch(fileParsed(second, "other.csv"));
                answer.resolve(answered("Zq Cafe"));
                yield* Effect.sleep("20 millis");
                const state = yield* SubscriptionRef.get(csvImport.state);
                expect(state.stage).not.toBe("settled");
            })
        );

        expect(store.getSnapshot().flow.resolution).toBeNull();
    });

    it("settles a provider failure as providerError", async () => {
        const parsed = parsedFile("Zq Cafe");
        const store = openDraft(parsed);
        const transport = vi.fn<CsvImportFn>().mockReturnValue(Effect.succeed({ ok: false, reason: "providerError" }));

        await withService(
            transport,
            store,
            Effect.gen(function* run() {
                const csvImport = yield* CsvImport.CsvImport;
                yield* csvImport.run(requestFor(parsed));
                yield* untilSettled;
            })
        );

        expect(store.getSnapshot().flow.resolution).toMatchObject({ outcome: "unavailable", reason: "providerError" });
    });

    it("never calls the model while AI enrichment is off", async () => {
        const parsed = parsedFile("Zq Cafe");
        const store = openDraft(parsed);
        const transport = vi.fn<CsvImportFn>();

        await withService(
            transport,
            store,
            Effect.gen(function* run() {
                const csvImport = yield* CsvImport.CsvImport;
                yield* csvImport.run(requestFor(parsed, { aiEnrichment: false }));
                yield* untilSettled;
            })
        );

        expect(transport).not.toHaveBeenCalled();
        expect(store.getSnapshot().flow.resolution).toMatchObject({ outcome: "declined", reason: null });
    });
});
