import { entryLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { wallNoon } from "@outlayr/money/ledger-zone";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { Badge } from "panelui-web/badge";
import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { NO_PHOTOS } from "@/components/dashboard/shell/photos";
import type { PhotoUrls } from "@/components/ledger/overview";
import { LookTile, MerchantTile } from "@/components/ledger/tiles";
import { NEUTRAL_COLOR } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { LANGUAGES, localeFromParam } from "@/lib/i18n";
import { useDisplayFormat } from "@/lib/ledger-settings";
import type { Candidate, RecurringModel, Seed } from "@/lib/recurring";

import { useImageUrls } from "../home/catalog";
import { useCategoryName } from "../home/format";

export const CELL = "h-[39px] px-3 py-0 align-middle first:ps-4 last:pe-3";
export const HEAD = "h-8 px-3 text-xs leading-4 font-medium first:ps-4 last:pe-3";
export const GROUP = "text-muted-foreground h-8 px-4 text-xs font-medium";
export const FIGURE = "dash-figure whitespace-nowrap";
export const MUTED = "text-muted-foreground whitespace-nowrap";

const PhotosContext = createContext<PhotoUrls>(NO_PHOTOS);

/** The newest entry a candidate was spotted from, which lends it its look. */
export const candidateDoc = (ledger: Ledger, candidate: Candidate) => {
    const id = candidate.entries.at(-1)?.id;
    return ledger.books.transactions.find((row) => row.localId === id);
};

export function LivePhotos({ children, model }: { children: ReactNode; model: RecurringModel }) {
    const { ledger } = useDashboard();
    const keys = useMemo(
        () => [
            ...new Set([
                ...model.schedules.flatMap((schedule) => schedule.seed.imageKey ?? []),
                ...model.candidates.flatMap((candidate) => candidateDoc(ledger, candidate)?.imageKey ?? []),
            ]),
        ],
        [ledger, model]
    );
    const urls = useImageUrls(keys);
    return <PhotosContext value={urls}>{children}</PhotosContext>;
}

type TileSeed = Pick<Seed, "categoryId" | "customColor" | "emoji" | "icon" | "imageColor" | "imageKey">;

export function ScheduleTile({ name, seed, size = "lg" }: { name: string; seed: TileSeed; size?: "lg" | "md" | "xl" }) {
    const { ledger } = useDashboard();
    const photos = useContext(PhotosContext);
    const category = ledger.books.categories.find((row) => row.localId === seed.categoryId);
    const look = entryLook(seed, category);
    const imageUrl = look.imageKey ? photos.get(look.imageKey) : undefined;
    if (imageUrl || !(look.icon || look.emoji)) {
        return <MerchantTile imageUrl={imageUrl} name={name || "?"} size={size} />;
    }
    return <LookTile look={look} plain size={size} />;
}

export function NameCell({ name, seed }: { name: string; seed: TileSeed }) {
    return (
        <span className="flex min-w-0 items-center gap-3">
            <ScheduleTile name={name} seed={seed} />
            <span className="truncate text-sm font-medium">{name}</span>
        </span>
    );
}

export function useAccountName() {
    const { ledger } = useDashboard();
    return (id: string | null) =>
        id === null ? "" : (ledger.books.accounts.find((row) => row.localId === id)?.name ?? "");
}

/** What a charge reads as in a table: a minus on spending, a plus on income. */
export function useChargeMoney() {
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    return {
        plain: (amount: number) => money(amount, ledger.currency),
        signed: (amount: number, income: boolean) => money(income ? amount : -amount, ledger.currency, "always"),
    };
}

export function useDay() {
    const { locale } = useLocale();
    const { date } = LANGUAGES[localeFromParam(locale)];
    return useMemo(() => {
        const dated = date === "en-GB" ? "en-US" : date;
        const short = new Intl.DateTimeFormat(dated, { day: "numeric", month: "short", timeZone: "UTC" });
        const year = new Intl.DateTimeFormat(dated, {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
            year: "numeric",
        });
        const month = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC" });
        const monthYear = new Intl.DateTimeFormat(date, { month: "long", timeZone: "UTC", year: "numeric" });
        const monthShort = new Intl.DateTimeFormat(dated, { month: "short", timeZone: "UTC" });
        const monthShortYear = new Intl.DateTimeFormat(dated, { month: "short", timeZone: "UTC", year: "numeric" });
        const weekday = new Intl.DateTimeFormat(date, { timeZone: "UTC", weekday: "long" });
        const weekdayShort = new Intl.DateTimeFormat(date, { timeZone: "UTC", weekday: "short" });
        const cap = (text: string) => `${text.charAt(0).toLocaleUpperCase(date)}${text.slice(1)}`;
        return {
            /** "Nov 22", with the year once it is not this one. */
            day: (day: string, today: string) =>
                (day.slice(0, 4) === today.slice(0, 4) ? short : year).format(wallNoon(day)),
            month: (key: string) => cap(month.format(wallNoon(`${key}-15`))),
            monthShort: (key: string, today: string) =>
                (key.slice(0, 4) === today.slice(0, 4) ? monthShort : monthShortYear).format(wallNoon(`${key}-15`)),
            monthYear: (key: string) => cap(monthYear.format(wallNoon(`${key}-15`))),
            weekday: (day: string) => weekday.format(wallNoon(day)),
            weekdayShort: (day: string) => cap(weekdayShort.format(wallNoon(day))),
        };
    }, [date]);
}

const ORDINAL = new Map([
    ["few", "rd"],
    ["one", "st"],
    ["two", "nd"],
]);

export function useRepeatText() {
    const { repeat } = useIntlayer("dashboard-recurring");
    const { locale } = useLocale();
    const days = useDay();
    const ordinals = useMemo(() => new Intl.PluralRules("en-US", { type: "ordinal" }), []);
    const short = (type: number, every: number) => {
        const count = String(every);
        if (type === RECURRING_TYPE.daily) {
            return every === 1 ? repeat.daily.value : repeat.everyDays({ count }).value;
        }
        if (type === RECURRING_TYPE.weekly) {
            return every === 1 ? repeat.weekly.value : repeat.everyWeeks({ count }).value;
        }
        if (type === RECURRING_TYPE.yearly) {
            return every === 1 ? repeat.yearly.value : repeat.everyYears({ count }).value;
        }
        return every === 1 ? repeat.monthly.value : repeat.everyMonths({ count }).value;
    };
    const word = (type: number, every: number) => {
        if (every !== 1) {
            return short(type, every).toLocaleLowerCase(locale);
        }
        if (type === RECURRING_TYPE.daily) {
            return repeat.dailyWord.value;
        }
        if (type === RECURRING_TYPE.weekly) {
            return repeat.weeklyWord.value;
        }
        return type === RECURRING_TYPE.yearly ? repeat.yearlyWord.value : repeat.monthlyWord.value;
    };
    const everyText = (type: number, every: number) => {
        if (every !== 1) {
            return short(type, every);
        }
        if (type === RECURRING_TYPE.daily) {
            return repeat.long.day.value;
        }
        if (type === RECURRING_TYPE.weekly) {
            return repeat.long.week.value;
        }
        return type === RECURRING_TYPE.yearly ? repeat.long.year.value : repeat.long.month.value;
    };
    /** "Every month, on the 22nd", read off the day the chain lands on. */
    const long = (type: number, every: number, day: string) => {
        const each = everyText(type, every);
        if (type === RECURRING_TYPE.daily) {
            return each;
        }
        if (type === RECURRING_TYPE.weekly) {
            return repeat.long.onWeekday({ every: each, weekday: days.weekday(day) }).value;
        }
        const date = Number(day.slice(8, 10));
        const english = localeFromParam(locale) === "en";
        const dayText =
            type === RECURRING_TYPE.yearly
                ? days.day(day, day)
                : `${date}${english ? (ORDINAL.get(ordinals.select(date)) ?? "th") : ""}`;
        return repeat.long.onDay({ day: dayText, every: each }).value;
    };
    return { everyText, long, short, word };
}

// `ledger.categories` only holds categories with a past entry,
// so a schedule that starts later would read as uncategorized.
export function useCategoryLook() {
    const { ledger } = useDashboard();
    const categoryName = useCategoryName();
    const { categories } = ledger.books;
    return useCallback(
        (id: string | null) => {
            const row = id === null ? undefined : categories.find((it) => it.localId === id && it.deletedAt === null);
            if (!row) {
                return null;
            }
            const parent = row.parentId ? categories.find((it) => it.localId === row.parentId) : undefined;
            return {
                color: row.color ?? parent?.color ?? NEUTRAL_COLOR,
                id: row.localId,
                name: categoryName({ id: row.localId, name: row.name ?? "" }),
            };
        },
        [categories, categoryName]
    );
}

export function CategoryBadge({ id }: { id: string | null }) {
    const look = useCategoryLook();
    const { test } = useIntlayer("dashboard-rules");
    const found = look(id);
    if (!found) {
        return <span className="text-muted-foreground text-[13px] whitespace-nowrap">{test.noCategory}</span>;
    }
    return (
        <Badge className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap" variant="outline">
            <i className="size-1.5 flex-none rounded-full" style={{ backgroundColor: found.color }} />
            {found.name}
        </Badge>
    );
}
