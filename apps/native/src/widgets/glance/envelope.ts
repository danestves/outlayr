import type { InsightsPeriod } from "../../data/insights";
import type { Language } from "../../i18n/languages";
import { WIDGET_PALETTE } from "../palette";
import type { WidgetPalette } from "../palette";

export interface WidgetAction {
    icon: string;
    label: string;
    url: string;
}

export interface WidgetEnvelope<Copy> {
    hidden?: boolean;
    locales: Record<Language, Copy>;
    nightColors: Record<string, string>;
    palette: WidgetPalette;
}

interface BalanceCopy {
    balance: string;
    balanceLabel: string;
    hideLabel: string;
    mask: string;
    showLabel: string;
}

export type WalletCopy = BalanceCopy & { actions: WidgetAction[] };

export interface TodayCopy {
    actions: WidgetAction[];
    count: string;
    label: string;
    spent: string;
}

export type OverviewCopy = BalanceCopy & {
    actions: WidgetAction[];
    budget: {
        fraction: number;
        label: string;
        left: string;
        over: boolean;
        pace: number;
        present: boolean;
        timeLeft: string;
    };
    today: { label: string; spent: string };
};

export interface WidgetSettingsCopy {
    close: string;
    done: string;
    groups: { default: string; key: string; label: string; options: { label: string; value: string }[] }[];
}

export type EntriesPeriod = "today" | InsightsPeriod;
export type EntriesMeasure = "spent" | "income" | "net";

export interface EntriesConfiguration {
    measure?: EntriesMeasure;
    period?: EntriesPeriod;
}

export interface EntriesCopy {
    add: WidgetAction;
    empty: string;
    entries: {
        amount: string;
        color: string;
        emoji: string;
        id: string;
        income: boolean;
        note: string;
        when: string;
    }[];
    headers: Record<EntriesPeriod, Record<EntriesMeasure, { amount: string; caption: string; tone: "ink" | "income" }>>;
    settings: WidgetSettingsCopy;
    url: string;
}

export type TrendsSelection = "app" | InsightsPeriod;

export interface TrendsConfiguration {
    period?: TrendsSelection;
}

export interface TrendsCopy {
    defaultPeriod: InsightsPeriod;
    labels: { income: string; net: string; spent: string };
    settings: WidgetSettingsCopy;
    url: string;
    windows: Record<
        InsightsPeriod,
        {
            bars: number[];
            caption: string;
            dayInitials: string[];
            income: string;
            net: string;
            netPositive: boolean;
            slices: { color: string; name: string; percent: string }[];
            spent: string;
        }
    >;
}

export interface AndroidWidgetProps {
    Entries: WidgetEnvelope<EntriesCopy>;
    Overview: WidgetEnvelope<OverviewCopy>;
    Today: WidgetEnvelope<TodayCopy>;
    Trends: WidgetEnvelope<TrendsCopy>;
    Wallet: WidgetEnvelope<WalletCopy>;
}

const darkByRole = new Map(Object.entries(WIDGET_PALETTE.dark));

export const NIGHT_COLORS = Object.fromEntries(
    Object.entries(WIDGET_PALETTE.light).map(([role, color]) => [color, darkByRole.get(role) ?? color])
);

export function envelope<Copy>(copy: (language: Language) => Copy): WidgetEnvelope<Copy> {
    return {
        locales: {
            en: copy("en"),
            es: copy("es"),
            "es-ES": copy("es-ES"),
            fr: copy("fr"),
            pt: copy("pt"),
            "pt-PT": copy("pt-PT"),
        },
        nightColors: NIGHT_COLORS,
        palette: WIDGET_PALETTE.light,
    };
}
