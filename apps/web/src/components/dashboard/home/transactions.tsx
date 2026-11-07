import { useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile, MerchantTile } from "@/components/ledger/tiles";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useCatalog, useImageUrls } from "./catalog";
import { useCategoryName, useDateFormat } from "./format";
import { viewRows } from "./rows";

const ROWS_SHOWN = 6;
const TABS = ["all", "expenses", "incomeTab"] as const;
type Tab = (typeof TABS)[number];

const TH =
    "text-muted-foreground h-9 px-3 text-left text-xs font-medium shadow-[inset_0_1px_0_var(--color-app-rule),inset_0_-1px_0_var(--color-app-rule)] first:pl-5 last:pr-5 last:text-right";
const TD = "border-border h-[42px] border-b px-3 first:pl-5 last:pr-5 last:text-right group-last:border-0";

export function Transactions() {
    const { filters, ledger, photos: accountPhotos } = useDashboard();
    const copy = useIntlayer("dashboard-home").transactions;
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const catalog = useCatalog(ledger);
    const [tab, setTab] = useState<Tab>("all");
    const [expanded, setExpanded] = useState(false);
    const rows = useMemo(() => {
        const every = viewRows(
            ledger,
            { accounts: filters.accounts, categories: filters.categories, period: filters.period },
            "newest"
        );
        return every
            .filter((row) => {
                if (tab === "all") {
                    return true;
                }
                return "income" in row && row.income === (tab === "incomeTab");
            })
            .slice(0, expanded ? undefined : ROWS_SHOWN);
    }, [expanded, filters.accounts, filters.categories, filters.period, ledger, tab]);
    const keys = useMemo(
        () => [
            ...new Set(
                rows.flatMap((row) => {
                    const key = "fromId" in row ? null : catalog.transaction(row.id)?.imageKey;
                    return key ? [key] : [];
                })
            ),
        ],
        [catalog, rows]
    );
    const photos = useImageUrls(keys);
    return (
        <section className="dash-card lg:col-span-2">
            <div className="dash-card-head pr-3">
                <h2>{copy.title}</h2>
                <div className="ml-3 flex h-[52px] gap-[18px]">
                    {TABS.map((each) => (
                        <button
                            aria-pressed={tab === each}
                            className={`relative flex items-center text-[13px] font-medium ${tab === each ? "after:bg-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-sm" : "text-muted-foreground"}`}
                            key={each}
                            onClick={() => setTab(each)}
                            type="button"
                        >
                            {copy[each]}
                        </button>
                    ))}
                </div>
                {expanded ? null : (
                    <button className="dash-ob ml-auto" onClick={() => setExpanded(true)} type="button">
                        {copy.seeAll}
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm whitespace-nowrap">
                    <colgroup>
                        <col className="w-[24.9%]" />
                        <col className="w-[22.3%]" />
                        <col className="w-[18.8%]" />
                        <col />
                        <col />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className={TH}>{copy.columns.merchant}</th>
                            <th className={TH}>{copy.columns.category}</th>
                            <th className={TH}>{copy.columns.account}</th>
                            <th className={TH}>{copy.columns.date}</th>
                            <th className={TH}>{copy.columns.amount}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td className="text-muted-foreground px-5 py-8 text-[13px]" colSpan={5}>
                                    {copy.empty}
                                </td>
                            </tr>
                        ) : null}
                        {rows.map((row) => {
                            if ("fromId" in row) {
                                const from = catalog.account(row.fromId);
                                const names = [row.fromId, row.toId].map((id) => ledger.accounts.get(id)?.name ?? "");
                                return (
                                    <tr className="group" key={row.id}>
                                        <td className={TD}>
                                            <span className="flex items-center gap-2.5 font-medium">
                                                {from ? (
                                                    <AccountTile account={from} photos={accountPhotos} size="lg" />
                                                ) : null}
                                                <span className="max-w-48 truncate">{names.join(" → ")}</span>
                                            </span>
                                        </td>
                                        <td className={TD}>
                                            <span className="dash-badge">{copy.transfer}</span>
                                        </td>
                                        <td
                                            aria-label={copy.columns.account.value}
                                            className={`${TD} text-muted-foreground`}
                                        />
                                        <td className={`${TD} dash-figure text-muted-foreground`}>
                                            {date.day(row.day)}
                                        </td>
                                        <td className={`${TD} dash-figure text-muted-foreground`}>
                                            {money(row.amount, ledger.currency)}
                                        </td>
                                    </tr>
                                );
                            }
                            const top = ledger.categories.get(row.topId);
                            const name = top ? categoryName(top) : "";
                            const merchant = row.note.trim() || name;
                            const imageKey = catalog.transaction(row.id)?.imageKey;
                            return (
                                <tr className="group" key={row.id}>
                                    <td className={TD}>
                                        <span className="flex items-center gap-2.5 font-medium">
                                            <MerchantTile
                                                imageUrl={imageKey ? photos?.get(imageKey) : undefined}
                                                name={merchant}
                                                size="lg"
                                            />
                                            <span className="max-w-48 truncate">{merchant}</span>
                                        </span>
                                    </td>
                                    <td className={TD}>
                                        <span className="dash-badge">
                                            <u style={{ color: top?.color }} />
                                            {name}
                                        </span>
                                    </td>
                                    <td className={`${TD} text-muted-foreground`}>
                                        {row.accountId ? (ledger.accounts.get(row.accountId)?.name ?? "") : ""}
                                    </td>
                                    <td className={`${TD} dash-figure text-muted-foreground`}>{date.day(row.day)}</td>
                                    <td className={`${TD} dash-figure ${row.income ? "text-app-income" : ""}`}>
                                        {money(row.income ? row.amount : -row.amount, ledger.currency, "always")}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
