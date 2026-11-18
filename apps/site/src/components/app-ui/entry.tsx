import type { Locale } from "@outlayr/shared/i18n";
import { getIntlayer } from "intlayer";

import done from "../../../../native/assets/toolbar-symbols/done.svg?url";
import { curtainShade, withAlpha } from "../../../../native/src/theme/shade";
import { AppFragment, AppScreen, SCREEN, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import { GlassCircle, SymbolMask } from "./chrome";
import { formatDayTitle, formatTime } from "./dates";
import { EntrySentence, FactChips, sentenceText } from "./entry-sentence";
import { EntryStage } from "./entry-stage";
import { FILLED, merchantIdentity, savedRow } from "./entry-state";
import type { EntryState } from "./entry-state";
import { DISPLAY_CORNER, Keyboard } from "./keyboard";
import { DEMO_NOW, daySections, imageColor } from "./ledger";
import type { DaySection, DemoRow } from "./ledger";
import { DaySectionHeader, RowHairline, TransactionRow } from "./list";
import { currencyFor, formatAmount, formatDayTotal } from "./money";
import { Sheet, SHEET } from "./parts";
import { appTranslator, interpolate } from "./strings";

const CONTENT_TOP = 132;
const CURTAIN_HEIGHT = 260;
const CURTAIN_STOPS = [
    [0, 0.92],
    [15, 0.82],
    [30, 0.69],
    [45, 0.55],
    [60, 0.4],
    [75, 0.23],
    [90, 0.08],
    [100, 0],
] as const;
const GLASS_LIFT = { dark: "calc(r + 34) calc(g + 33) calc(b + 33)", light: "55%" } as const;
const DONE = { icon: 22, left: 342, size: 44, top: 78 } as const;
const SENTENCE_LINES = 3;
const SENTENCE_LINE = 38;
const SENTENCE_PAD = 32;
const TODAY = { bottom: 10, gutter: 20, header: 35, radius: 28, row: 48 } as const;

function useCurtainShade(state: EntryState) {
    const { theme } = useReplica();
    const hue = imageColor(merchantIdentity(state.name)?.logo ?? null);
    return hue === null ? null : curtainShade(hue, theme === "dark");
}

function useCurtainGlass(state: EntryState) {
    const { theme } = useReplica();
    const shade = useCurtainShade(state);
    if (shade === null) {
        return undefined;
    }
    return theme === "dark"
        ? `rgb(from ${shade} ${GLASS_LIFT.dark})`
        : `color-mix(in srgb, ${shade} ${GLASS_LIFT.light}, #ffffff)`;
}

function Curtain({ state }: { state: EntryState }) {
    const shade = useCurtainShade(state);
    if (shade === null) {
        return null;
    }
    const stops = CURTAIN_STOPS.map(([at, alpha]) => `${withAlpha(shade, alpha)} ${at}%`).join(", ");
    return (
        <div
            className="absolute inset-x-0 top-0"
            style={{ background: `linear-gradient(${stops})`, height: CURTAIN_HEIGHT }}
        />
    );
}

function sheetLabel(state: EntryState, now: Date, locale: Locale) {
    return interpolate(getIntlayer("appUi", locale).labels.entrySheet, {
        sentence: sentenceText(state, now, locale, appTranslator(locale)),
    });
}

function NewEntrySheet({ now, state }: { now: Date; state: EntryState }) {
    const { t } = useReplica();
    const glass = useCurtainGlass(state);
    const keyboard = state.surface === "keyboard";
    return (
        <>
            <Sheet bottomRadius={DISPLAY_CORNER} glass={glass} title={t("transaction.new.title")}>
                <Curtain state={state} />
                <div className="absolute inset-x-0 px-5 pt-8" style={{ top: CONTENT_TOP - SHEET.top }}>
                    <EntrySentence now={now} state={state} />
                    <FactChips state={state} />
                </div>
                <EntryStage state={state} />
            </Sheet>
            {keyboard ? (
                <>
                    <GlassCircle fill={glass} left={DONE.left} size={DONE.size} top={DONE.top}>
                        <SymbolMask color="var(--subtle)" size={DONE.icon} src={done} />
                    </GlassCircle>
                    <Keyboard upper={state.name === ""} />
                </>
            ) : null}
        </>
    );
}

export interface NewEntryScreenProps extends CanvasProps {
    now?: Date;
    state?: EntryState;
}

export function NewEntryScreen({ now = DEMO_NOW, state = FILLED, ...canvas }: NewEntryScreenProps) {
    return (
        <AppScreen {...canvas} label={sheetLabel(state, now, canvas.locale)}>
            <NewEntrySheet now={now} state={state} />
        </AppScreen>
    );
}

const SENTENCE_CARD_HEIGHT = CONTENT_TOP - SHEET.top + SENTENCE_PAD * 2 + SENTENCE_LINES * SENTENCE_LINE;

function SentenceCardBody({ now, state }: { now: Date; state: EntryState }) {
    const { t } = useReplica();
    const glass = useCurtainGlass(state);
    return (
        <div className="absolute inset-x-0" style={{ height: SENTENCE_CARD_HEIGHT + SHEET.top, top: -SHEET.top }}>
            <Sheet backdrop={false} bottomRadius={SHEET.radius} glass={glass} title={t("transaction.new.title")}>
                <Curtain state={state} />
                <div className="absolute inset-x-0 px-5 pt-8" style={{ top: CONTENT_TOP - SHEET.top }}>
                    <EntrySentence now={now} state={state} />
                </div>
            </Sheet>
        </div>
    );
}

export interface SentenceCardProps extends CanvasProps {
    now?: Date;
    state?: EntryState;
}

export function SentenceCard({ now = DEMO_NOW, state = FILLED, ...canvas }: SentenceCardProps) {
    const label = interpolate(getIntlayer("appUi", canvas.locale).labels.entrySentence, {
        sentence: sentenceText(state, now, canvas.locale, appTranslator(canvas.locale)),
    });
    return (
        <AppFragment {...canvas} height={SENTENCE_CARD_HEIGHT} label={label} width={SCREEN.width}>
            <SentenceCardBody now={now} state={state} />
        </AppFragment>
    );
}

function todaySection(now: Date, extra: readonly DemoRow[]): DaySection {
    const [ledger] = daySections(now, 0);
    const rows = [...extra, ...(ledger?.rows ?? [])].toSorted((a, b) => b.date.getTime() - a.date.getTime());
    const total = rows.reduce((sum, row) => sum + (row.income ? row.amountUsd : -row.amountUsd), 0);
    return { day: ledger?.day ?? now, rows, total: Math.round(total * 100) / 100 };
}

function todayLabel(section: DaySection, now: Date, locale: Locale) {
    const t = appTranslator(locale);
    const code = currencyFor(locale);
    const rows = section.rows.map(
        (row) =>
            `${row.note} ${row.income ? "+" : "-"}${formatAmount(row.amount, code, locale)} ${formatTime(row.date, locale, t)}`
    );
    return interpolate(getIntlayer("appUi", locale).labels.entryToday, {
        day: formatDayTitle(section.day, now, locale, t),
        rows: rows.join(", "),
        total: formatDayTotal(section.total, code, locale),
    });
}

export interface TodayCardProps extends CanvasProps {
    extra?: readonly DemoRow[];
    now?: Date;
}

const DEFAULT_EXTRA = [savedRow(FILLED)].filter((row) => row !== null);

export function TodayCard({ extra = DEFAULT_EXTRA, now = DEMO_NOW, ...canvas }: TodayCardProps) {
    const section = todaySection(now, extra);
    const count = section.rows.length;
    const height = TODAY.header + count * TODAY.row + Math.max(count - 1, 0) + TODAY.bottom;
    return (
        <AppFragment {...canvas} height={height} label={todayLabel(section, now, canvas.locale)} width={SCREEN.width}>
            <div
                className="bg-background absolute inset-0 overflow-hidden"
                style={{ borderRadius: TODAY.radius, paddingInline: TODAY.gutter }}
            >
                <DaySectionHeader first now={now} section={section} />
                {section.rows.map((row, index) => (
                    <div key={row.id}>
                        {index > 0 ? <RowHairline /> : null}
                        <TransactionRow row={row} />
                    </div>
                ))}
            </div>
        </AppFragment>
    );
}
