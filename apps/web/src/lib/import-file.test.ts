import { fixedOffset } from "@outlayr/money/ledger-zone";
import { describe, expect, it } from "vite-plus/test";

import { matchDuplicates, readCsvText, readDates, readRows, repairRow, statementOf } from "./import-file";
import type { ExistingEntry, FaultyRow, Target } from "./import-file";

const HOUR = 3_600_000;
const BOGOTA = fixedOffset(-5 * HOUR);
const DAY_FIRST = { dateFormat: "dd/MM/yyyy", offsetAt: BOGOTA };

const fileOf = (text: string) => {
    const read = readCsvText(text);
    if (!read.ok) {
        throw new Error(read.problem);
    }
    return read.file;
};

const BANK_TARGETS: Target[] = ["date", "merchant", "amountOut", "amountIn", "balance"];

describe("readRows", () => {
    it("files a date-only row on the ledger's midnight, not the browser's", () => {
        const { rows } = readRows(
            fileOf("Date,Name,Amount\n29/07/2026,Bakery,-12.50"),
            ["date", "merchant", "amount"],
            DAY_FIRST
        );

        expect(rows[0]?.at).toBe(Date.UTC(2026, 6, 29) + 5 * HOUR);
    });

    it("keeps a timestamp that names its own zone as the instant it states", () => {
        const { rows } = readRows(
            fileOf("Date,Name,Amount\n2026-07-29T02:00:00Z,Bakery,-12.50"),
            ["date", "merchant", "amount"],
            { dateFormat: "ISO", offsetAt: BOGOTA }
        );

        expect(rows[0]?.at).toBe(Date.UTC(2026, 6, 29, 2));
    });

    it("reads separate out and in columns as spending and income", () => {
        const { rows } = readRows(
            fileOf("Date,Name,Out,In,Balance\n29/07/2026,Bakery,12.50,,100\n30/07/2026,Payroll,,2400,2500"),
            BANK_TARGETS,
            DAY_FIRST
        );

        expect(rows.map(({ amount, income }) => ({ amount, income }))).toStrictEqual([
            { amount: 12.5, income: false },
            { amount: 2400, income: true },
        ]);
    });

    it("sets aside a row with no amount and a row with a bad date, keeping the amount it read", () => {
        const { faulty, rows } = readRows(
            fileOf("Date,Name,Amount\n29/07/2026,Bakery,\n31/02/2026,Rent,-900\n30/07/2026,Coffee,-3"),
            ["date", "merchant", "amount"],
            DAY_FIRST
        );

        expect(rows.map((row) => row.label)).toStrictEqual(["Coffee"]);
        expect(faulty.map(({ amount, fault, label }) => ({ amount, fault, label }))).toStrictEqual([
            { amount: null, fault: "amount", label: "Bakery" },
            { amount: 900, fault: "date", label: "Rent" },
        ]);
    });
});

describe("readCsvText", () => {
    it("reads a 200,000 row file without overflowing the stack", () => {
        const body = Array.from({ length: 200_000 }, () => "29/07/2026,Coffee,-3").join("\n");

        expect(readCsvText(`Date,Name,Amount\n${body}`)).toMatchObject({ file: { width: 3 }, ok: true });
    });
});

describe("readDates", () => {
    it("asks when every date reads both ways and the readings differ", () => {
        expect(readDates(["03/04/2026", "05/06/2026"])).toMatchObject({ kind: "ambiguous" });
    });

    it("knows the order once a day goes past 12", () => {
        expect(readDates(["03/04/2026", "25/06/2026"])).toStrictEqual({ format: "dd/MM/yyyy", kind: "known" });
    });
});

const existing = (id: string, accountId: string | null): ExistingEntry => ({
    accountId,
    amount: 3,
    at: Date.UTC(2026, 6, 29, 15),
    currency: "USD",
    id,
    income: false,
});

const fileRow = (index: number, accountId: string | null) => ({
    accountId,
    amount: 3,
    at: Date.UTC(2026, 6, 29, 20),
    currency: "USD",
    income: false,
    index,
});

describe("matchDuplicates", () => {
    it("lets one logged coffee answer for one of two identical rows", () => {
        const matched = matchDuplicates([fileRow(0, null), fileRow(1, null)], [existing("logged", null)], BOGOTA);

        expect([...matched.keys()]).toStrictEqual([0]);
    });

    it("prefers the entry on the same account", () => {
        const matched = matchDuplicates(
            [fileRow(0, "card")],
            [existing("on-cash", "cash"), existing("on-card", "card")],
            BOGOTA
        );

        expect(matched.get(0)?.id).toBe("on-card");
    });

    it("compares days in the ledger's zone", () => {
        const lateNight = { ...fileRow(0, null), at: Date.UTC(2026, 6, 30, 3) };

        expect(matchDuplicates([lateNight], [existing("logged", null)], BOGOTA).size).toBe(1);
    });
});

describe("statementOf", () => {
    it("reads start and end from a newest-first statement", () => {
        const { rows } = readRows(
            fileOf("Date,Name,Out,In,Balance\n30/07/2026,Payroll,,2400,2487.50\n29/07/2026,Bakery,12.50,,87.50"),
            BANK_TARGETS,
            DAY_FIRST
        );

        expect(statementOf(rows)).toStrictEqual({ end: 2487.5, start: 100 });
    });
});

const faultyRow = (patch: Partial<FaultyRow>): FaultyRow => ({
    account: null,
    amount: null,
    balance: null,
    category: null,
    currency: null,
    dateText: "29/07/2026",
    fault: "amount",
    income: false,
    index: 0,
    label: "Bakery",
    ...patch,
});

describe("repairRow", () => {
    it("reads a typed plus as money in and anything else as money out", () => {
        expect(repairRow(faultyRow({}), { amount: " +12.50", date: "" }, DAY_FIRST)).toMatchObject({
            amount: 12.5,
            income: true,
        });
        expect(repairRow(faultyRow({}), { amount: "12.50", date: "" }, DAY_FIRST)).toMatchObject({
            amount: 12.5,
            income: false,
        });
    });

    it("files a picked date on the ledger's midnight", () => {
        const fixed = repairRow(
            faultyRow({ amount: 900, dateText: "31/02/2026", fault: "date" }),
            { amount: "", date: "2026-02-28" },
            DAY_FIRST
        );

        expect(fixed?.at).toBe(Date.UTC(2026, 1, 28) + 5 * HOUR);
    });

    it("refuses a zero amount", () => {
        expect(repairRow(faultyRow({}), { amount: "0", date: "" }, DAY_FIRST)).toBeNull();
    });
});
