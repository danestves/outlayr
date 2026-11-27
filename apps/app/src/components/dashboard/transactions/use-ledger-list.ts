import { useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import { useTagBooks } from "@/lib/ledger-db";
import type { Tag } from "@/lib/ledger-db";
import { liveTags } from "@/lib/rule-writes";

import { useCatalog } from "../home/catalog";
import { titled } from "../home/format";
import type { FoldedRow, TableRow } from "../home/rows";
import { narrowed, querySort, queryRows, rangeOf, sortedRows, taggedIds } from "./model";
import type { Range, Sort, Span } from "./model";

export interface ListParams {
    accounts: readonly string[];
    categories: readonly string[];
    custom: Partial<Range>;
    max: number | null;
    merchants: readonly string[];
    min: number | null;
    q: string;
    sort: Sort;
    span: Span | undefined;
    tags: readonly string[];
}

const NO_TAGS: readonly Tag[] = [];

export function useLedgerList() {
    const { filters, ledger } = useDashboard();
    const { uncategorized } = useIntlayer("dashboard-home");
    const { transferName } = useIntlayer("dashboard-ledger");
    const { locale } = useLocale();
    const catalog = useCatalog(ledger);
    const tagBooks = useTagBooks();
    const tags = useMemo(() => liveTags(tagBooks), [tagBooks]);
    const tagsOf = useMemo(() => {
        const byId = new Map(tags.map((tag) => [tag.localId, tag]));
        const linked = new Map<string, Tag[]>();
        for (const link of tagBooks.links) {
            const tag = byId.get(link.tagId);
            if (link.deletedAt === null && tag) {
                linked.set(link.transactionId, [...(linked.get(link.transactionId) ?? []), tag]);
            }
        }
        return (id: string) => linked.get(id) ?? NO_TAGS;
    }, [tagBooks.links, tags]);
    const review = useMemo(
        () =>
            new Set(
                ledger.books.transactions
                    .filter((row) => row.unreviewed === true && row.deletedAt === null)
                    .map((row) => row.localId)
            ),
        [ledger.books.transactions]
    );
    const names = useMemo(() => {
        const books = new Map(ledger.books.categories.map((row) => [row.localId, row]));
        const account = (id: string | null) => (id === null ? "" : (ledger.accounts.get(id)?.name ?? ""));
        const category = (id: string | null) => {
            if (id === null || id === UNCATEGORIZED_ID) {
                return id === null ? "" : uncategorized.value;
            }
            const found = ledger.categories.get(id) ?? books.get(id);
            return found?.name ? titled(found.name, locale) : "";
        };
        const merchant = (row: TableRow) =>
            "fromId" in row
                ? transferName({ from: account(row.fromId), to: account(row.toId) }).value
                : row.note.trim() || category(row.topId);
        return { account, category, merchant };
    }, [ledger, locale, transferName, uncategorized.value]);
    const transferNotes = useMemo(
        () => new Map(ledger.books.transfers.map((move) => [move.localId, move.note])),
        [ledger.books.transfers]
    );
    const text = useMemo(
        () => (row: FoldedRow) =>
            "fromId" in row
                ? `${names.merchant(row)} ${transferNotes.get(row.id) ?? ""}`
                : [
                      names.merchant(row),
                      names.category(row.topId),
                      names.category(row.categoryId),
                      names.account(row.accountId),
                      catalog.transaction(row.id)?.details ?? "",
                      ...tagsOf(row.id).map((tag) => `#${tag.name}`),
                  ].join(" "),
        [catalog, names, tagsOf, transferNotes]
    );
    const liveTagIds = useMemo(() => new Set(tags.map((tag) => tag.localId)), [tags]);
    const refine = useMemo(
        () => (params: ListParams, found: readonly FoldedRow[], sort: Sort) => {
            const kept = narrowed(found, {
                merchantOf: names.merchant,
                merchants: params.merchants,
                tagged: taggedIds(
                    tagBooks.links,
                    liveTagIds,
                    params.tags,
                    found.map((row) => row.id)
                ),
            });
            return sortedRows(
                ledger,
                kept,
                sort,
                { category: (row) => ("fromId" in row ? "" : names.category(row.topId)), merchant: names.merchant },
                locale
            );
        },
        [ledger, liveTagIds, locale, names, tagBooks.links]
    );
    const rows = useMemo(
        () => (params: ListParams) => {
            const range = rangeOf(
                { custom: params.custom, key: filters.period.key, span: params.span },
                ledger.firstDayOfMonth
            );
            const listed = queryRows(
                ledger,
                {
                    accounts: params.accounts,
                    categories: params.categories,
                    max: params.max,
                    min: params.min,
                    q: params.q,
                    range,
                    sort: querySort(params.sort),
                    type: undefined,
                },
                text
            );
            return refine(params, listed, params.sort);
        },
        [filters.period.key, ledger, refine, text]
    );
    const upcoming = useMemo(
        () => (params: ListParams) =>
            refine(
                params,
                queryRows(
                    { ...ledger, rows: ledger.upcoming, transfers: [] },
                    {
                        accounts: params.accounts,
                        categories: params.categories,
                        max: params.max,
                        min: params.min,
                        q: params.q,
                        range: null,
                        sort: "oldest",
                        type: undefined,
                    },
                    text
                ),
                "oldest"
            ),
        [ledger, refine, text]
    );
    const transferNote = (id: string) => transferNotes.get(id) ?? "";
    return { catalog, names, review, rows, tags, tagsOf, text, transferNote, upcoming };
}

export type LedgerList = ReturnType<typeof useLedgerList>;
