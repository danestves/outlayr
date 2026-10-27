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
    budget: { fraction: number; label: string; left: string; over: boolean; present: boolean };
    today: { label: string; spent: string };
};

export interface AndroidWidgetProps {
    Overview: WidgetEnvelope<OverviewCopy>;
    Today: WidgetEnvelope<TodayCopy>;
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
