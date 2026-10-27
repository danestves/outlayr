import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Effect from "effect/Effect";
import { Alert } from "react-native";

import { testLocalData as mockTestLocalData } from "@/contexts/test-local-data";
import type { ImportPlan } from "@/data/transfer-core";
import * as transferCore from "@/data/transfer-core";
import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import { INITIAL_IMPORT_FLOW_STATE } from "@/domain/import-flow";
import { importDraftStore } from "@/lib/import-draft-store";

import { buildReviewRows, useImportReview } from "./use-import-review";

const mockGoBack = jest.fn();
const mockUseNavigation = jest.fn((_parent?: string) => ({
    goBack: mockGoBack,
}));

jest.mock("expo-router", () => ({
    useNavigation: (parent?: string) => mockUseNavigation(parent),
}));
jest.mock<Partial<typeof import("@/i18n/context")>>("@/i18n/context", () => ({
    useTranslation: () => (key: string, params?: Record<string, unknown>) =>
        params ? `${key}:${JSON.stringify(params)}` : key,
}));

const dbHolder: { current: Database | null } = { current: null };
jest.mock("@/contexts/local-data-context", () => ({
    useDatabase: () => dbHolder.current,
    useLocalData: () => mockTestLocalData({ db: dbHolder.current }),
}));

const NOW = new Date(2026, 6, 29, 12);

async function seedCategories(db: Database) {
    await db.insert(categories).values([
        {
            color: "#3D8A4E",
            icon: "basket",
            id: "cat-food",
            income: false,
            name: "Groceries",
            updatedAt: NOW,
        },
        {
            color: "#2E5AAC",
            emoji: "💰",
            id: "cat-pay",
            income: true,
            name: "Paycheck",
            updatedAt: NOW,
        },
    ]);
}

const ROWS = [
    ["Food", "Bakery", "2026-07-28", "12.50"],
    ["Pay", "Salary", "2026-07-27", "2400"],
];
const MAPPING = {
    amount: 3,
    category: 0,
    currency: null,
    date: 2,
    exchangeRate: null,
    exchangeRateType: null,
    note: 1,
    type: null,
};
const LINKS = new Map([
    ["food", "cat-food"],
    ["pay", "cat-pay"],
]);

function withReview() {
    importDraftStore.dispatch({ sourceId: "csv", type: "sourceSelected" });
    importDraftStore.dispatch({
        draft: MAPPING,
        file: { chars: 80, name: "bank.csv" },
        gaps: [],
        parsed: { header: null, rows: ROWS, width: 4 },
        resolved: { labelSource: "categoryColumn", mapping: MAPPING },
        type: "fileParsed",
    });
    importDraftStore.dispatch({
        fromModel: new Set(),
        links: LINKS,
        outcome: "applied",
        reason: null,
        type: "resolutionSettled",
    });
    importDraftStore.setStep("review");
}

beforeEach(() => {
    dbHolder.current = migratedDatabase();
    importDraftStore.clear();
    mockGoBack.mockClear();
    mockUseNavigation.mockClear();
});

describe("buildReviewRows", () => {
    const plan: ImportPlan = {
        earliest: new Date(2026, 6, 27),
        entries: [
            {
                amount: 12.5,
                categoryId: "cat-food",
                currency: null,
                date: new Date(2026, 6, 28),
                income: false,
                note: "Bakery",
            },
            {
                amount: 2400,
                categoryId: "cat-pay",
                currency: null,
                date: new Date(2026, 6, 27),
                income: true,
                note: "Salary",
            },
        ],
        latest: new Date(2026, 6, 28),
        skipped: [{ reason: "amount", row: 3 }],
    };

    it("maps every entry in order, flagging duplicates from the given set", () => {
        const rows = buildReviewRows(plan, new Set([1]));
        expect(rows[0]).toMatchObject({
            duplicate: false,
            index: 0,
            kind: "entry",
        });
        expect(rows[1]).toMatchObject({ duplicate: true, index: 1, kind: "entry" });
    });

    it("appends a trailing header and skipped rows when any exist", () => {
        const rows = buildReviewRows(plan, new Set());
        expect(rows[2]).toStrictEqual({
            count: 1,
            key: "skipped-header",
            kind: "header",
        });
        expect(rows[3]).toStrictEqual({
            key: "skipped-3",
            kind: "skipped",
            reason: "amount",
            row: 3,
        });
    });

    it("omits the header entirely when nothing was skipped", () => {
        const rows = buildReviewRows({ ...plan, skipped: [] }, new Set());
        expect(rows.some((row) => row.kind === "header")).toBe(false);
    });
});

describe("useImportReview", () => {
    it("builds the plan from the settled flow, including each entry's resolved income", async () => {
        await seedCategories(dbHolder.current as Database);
        withReview();

        const { result } = await renderHook(() => useImportReview());

        await waitFor(() => expect(result.current.plan.entries).toHaveLength(2));
        expect(result.current.plan.entries[0]?.income).toBe(false);
        expect(result.current.plan.entries[1]?.income).toBe(true);
        expect(result.current.selectedCount).toBe(2);
    });

    it("flags a row matching an existing transaction as a duplicate, unchecked by default", async () => {
        const db = dbHolder.current as Database;
        await seedCategories(db);
        await db.insert(transactions).values({
            amount: 12.5,
            categoryId: "cat-food",
            date: new Date(2026, 6, 28),
            day: new Date(2026, 6, 28),
            id: "t-existing",
            income: false,
            month: new Date(2026, 6, 1),
            note: "Bakery",
            updatedAt: NOW,
        });
        withReview();

        const { result } = await renderHook(() => useImportReview());

        await waitFor(() => expect(result.current.selectedCount).toBe(1));
        expect(result.current.excluded.has(0)).toBe(true);
        expect(result.current.rows[0]).toMatchObject({ duplicate: true });
    });

    it("preserves a manual re-check across a remount with the same resolution", async () => {
        const db = dbHolder.current as Database;
        await seedCategories(db);
        await db.insert(transactions).values({
            amount: 12.5,
            categoryId: "cat-food",
            date: new Date(2026, 6, 28),
            day: new Date(2026, 6, 28),
            id: "t-existing",
            income: false,
            month: new Date(2026, 6, 1),
            note: "Bakery",
            updatedAt: NOW,
        });
        withReview();

        const first = await renderHook(() => useImportReview());
        await waitFor(() => expect(first.result.current.excluded.has(0)).toBe(true));
        await act(async () => {
            first.result.current.onToggle(0);
        });
        expect(importDraftStore.getSnapshot().flow.excluded.has(0)).toBe(false);

        const second = await renderHook(() => useImportReview());
        await waitFor(() => expect(second.result.current.plan.entries).toHaveLength(2));
        expect(second.result.current.excluded.has(0)).toBe(false);
    });

    it("onCommit writes every non-excluded entry, records the success and advances to the done step without clearing the draft", async () => {
        const db = dbHolder.current as Database;
        await seedCategories(db);
        withReview();
        const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

        const { result } = await renderHook(() => useImportReview());
        await waitFor(() => expect(result.current.plan.entries).toHaveLength(2));

        await act(async () => {
            result.current.onCommit();
            await Promise.resolve();
            await Promise.resolve();
        });

        await expect(db.select().from(transactions)).resolves.toHaveLength(2);
        const snapshot = importDraftStore.getSnapshot();
        expect(snapshot.flow.commit).toStrictEqual({
            count: 2,
            duplicatesSkipped: 0,
            outTotals: [{ amount: -12.5, currencyCode: "USD", transactionCount: 1 }],
            phase: "success",
        });
        expect(snapshot.flow).not.toStrictEqual(INITIAL_IMPORT_FLOW_STATE);
        expect(snapshot.ui.step).toBe("done");
        expect(alertSpy).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    it("onCommit writes once when it is called twice before React re-renders", async () => {
        const db = dbHolder.current as Database;
        await seedCategories(db);
        withReview();
        const applySpy = jest.spyOn(transferCore, "applyImport");

        const { result } = await renderHook(() => useImportReview());
        await waitFor(() => expect(result.current.plan.entries).toHaveLength(2));

        await act(async () => {
            result.current.onCommit();
            result.current.onCommit();
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(applySpy).toHaveBeenCalledTimes(1);
        await expect(db.select().from(transactions)).resolves.toHaveLength(2);
        applySpy.mockRestore();
    });

    it("onCommit failure keeps the sheet's selections intact and reports the failure, without navigating", async () => {
        await seedCategories(dbHolder.current as Database);
        withReview();
        const applySpy = jest
            .spyOn(transferCore, "applyImport")
            .mockReturnValueOnce(
                Effect.fail(new transferCore.CsvTransferError({ cause: new Error("disk full"), operation: "import" }))
            );

        const { result } = await renderHook(() => useImportReview());
        await waitFor(() => expect(result.current.plan.entries).toHaveLength(2));
        const excludedBefore = result.current.excluded;

        await act(async () => {
            result.current.onCommit();
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() =>
            expect(importDraftStore.getSnapshot().flow.commit).toStrictEqual({
                detail: "disk full",
                phase: "failed",
            })
        );
        expect(importDraftStore.getSnapshot().flow.excluded).toBe(excludedBefore);
        expect(mockGoBack).not.toHaveBeenCalled();
        applySpy.mockRestore();
    });
});
