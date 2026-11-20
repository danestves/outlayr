import { wallNoon } from "@outlayr/money/ledger-zone";
import { LANGUAGES, localeFromParam } from "@outlayr/shared/i18n";
import { Badge } from "panelui-web/badge";
import { useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { NEUTRAL_COLOR } from "@/lib/dashboard-series-ledger";
import type { Condition } from "@/lib/rules";

import { useCategoryName } from "../home/format";

export const CELL = "h-14 px-3 py-0 align-middle first:ps-4 last:pe-3.5";
export const HEAD = "text-app-caption! h-10 px-3 font-medium first:ps-4 last:pe-3.5";
export const NAME = "text-app-body font-medium whitespace-nowrap";
export const FIGURE = "dash-figure whitespace-nowrap";
export const LIT = "bg-primary/10 hover:bg-primary/10";
export const NOTE = "text-muted-foreground text-app-label";

export function useShortDay() {
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(date === "en-GB" ? "en-US" : date, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
        });
        return (day: string) => format.format(wallNoon(day));
    }, [date]);
}

export function useCategoryLook() {
    const { ledger } = useDashboard();
    const categoryName = useCategoryName();
    return (id: string) => {
        const category = ledger.categories.get(id);
        if (category) {
            return { color: category.color, name: categoryName(category) };
        }
        const { categories } = ledger.books;
        const row = categories.find((candidate) => candidate.localId === id && candidate.deletedAt === null);
        if (!row) {
            return null;
        }
        const parent = categories.find((candidate) => candidate.localId === row.parentId);
        return {
            color: row.color ?? parent?.color ?? NEUTRAL_COLOR,
            name: categoryName({ id: row.localId, name: row.name ?? "" }),
        };
    };
}

export function CategoryBadge({ id }: { id: string | null }) {
    const look = useCategoryLook();
    const { test } = useIntlayer("dashboard-rules");
    const found = id === null ? null : look(id);
    if (!found) {
        return <span className="text-muted-foreground text-app-label whitespace-nowrap">{test.noCategory}</span>;
    }
    return (
        <Badge
            className="rounded-app-xs text-app-caption h-6 gap-1.5 px-2 font-medium whitespace-nowrap"
            variant="outline"
        >
            <i className="size-1.5 flex-none rounded-full" style={{ backgroundColor: found.color }} />
            {found.name}
        </Badge>
    );
}

export function TagMarks({ ids, names }: { ids: readonly string[]; names: ReadonlyMap<string, string> }) {
    return ids.flatMap((id) => {
        const name = names.get(id);
        return name === undefined
            ? []
            : [
                  <span className="text-muted-foreground text-app-caption whitespace-nowrap" key={id}>
                      #{name}
                  </span>,
              ];
    });
}

const CENTS = 2;

export function useConditionText() {
    const { fields, ops } = useIntlayer("dashboard-rules");
    const { locale } = useLocale();
    return (condition: Condition) => ({
        field: fields[condition.field].value,
        op: ops[condition.op].value,
        value:
            condition.field === "amount"
                ? condition.value.toLocaleString(locale, {
                      maximumFractionDigits: CENTS,
                      minimumFractionDigits: CENTS,
                  })
                : condition.value,
    });
}

export function ConditionChip({ condition }: { condition: Condition }) {
    const text = useConditionText()(condition);
    return (
        <span className="bg-app-fill rounded-app-xs text-app-caption inline-flex h-6 items-center gap-1 px-1.5 whitespace-nowrap">
            <span className="text-muted-foreground">{text.field}</span>
            {text.op}
            <span className="dash-figure max-w-40 truncate">{text.value}</span>
        </span>
    );
}
