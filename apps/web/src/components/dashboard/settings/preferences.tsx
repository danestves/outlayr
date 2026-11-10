import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { ACCENT_PALETTE } from "@outlayr/money/accent";
import { ChoiceCards } from "panelui-web/choice-cards";
import { Select } from "panelui-web/select";
import { useContext, useId, useState, useSyncExternalStore } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { LocalizedLink } from "@/components/localized-link";
import { chooseAiConsent, useAiConsent } from "@/lib/ai-consent";
import { chooseConsent, readConsent, subscribeConsent } from "@/lib/analytics";
import { DASHBOARD_LOCALES, chooseDashboardLocale } from "@/lib/dashboard-locale";
import { LANGUAGES } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { LedgerSettingsContext, metaFlag, useDisplayFormat, useMeta } from "@/lib/ledger-settings";
import { chooseTheme, readTheme, subscribeTheme, THEMES } from "@/lib/theme";

import { SuggestDialog } from "./about/suggest";
import { Choice, Row, SectionHead, SettingsCard, ToggleRow, useSaveSettings } from "./parts";

const SAMPLE_AMOUNT = 1284;

export function Preferences() {
    const copy = useIntlayer("dashboard-settings");
    return (
        <>
            <SectionHead title={copy.sections.preferences} />
            <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-2">
                <div className="grid gap-4">
                    <MoneyCard />
                    <UpcomingCard />
                    <PrivacyCard />
                </div>
                <div className="grid gap-4">
                    <AppearanceCard />
                    <HelpCard />
                </div>
            </div>
        </>
    );
}

function MoneyCard() {
    const { money: copy } = useIntlayer("dashboard-settings");
    const { currency, incomeTracking, showCents } = useContext(LedgerSettingsContext);
    const { money } = useDisplayFormat();
    const save = useSaveSettings();
    return (
        <SettingsCard
            action={<span className="text-muted-foreground font-mono text-sm">{money(SAMPLE_AMOUNT, currency)}</span>}
            title={copy.title}
        >
            <ToggleRow
                checked={showCents}
                label={copy.showCents.value}
                onChange={(next) => save({ showCents: String(next) })}
            />
            <ToggleRow
                checked={incomeTracking}
                label={copy.incomeTracking.value}
                onChange={(next) => save({ incomeTracking: String(next) })}
            />
        </SettingsCard>
    );
}

function AppearanceCard() {
    const { appearance: copy } = useIntlayer("dashboard-settings");
    const { accent, animatedCharts } = useContext(LedgerSettingsContext);
    const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "system" as const);
    const save = useSaveSettings();
    return (
        <SettingsCard title={copy.title}>
            <Row label={copy.theme}>
                <Choice
                    label={copy.theme.value}
                    onChange={chooseTheme}
                    options={THEMES.map((value) => ({ label: copy[value].value, value }))}
                    value={theme}
                />
            </Row>
            <Row hint={copy.accents[accent.key]} label={copy.accent}>
                <ChoiceCards
                    aria-label={copy.accent.value}
                    aspect="1 / 1"
                    className="flex w-fit shrink-0 gap-2"
                    onValueChange={(next) => {
                        const picked = ACCENT_PALETTE.find((option) => option.key === next);
                        if (picked) {
                            save({ accentColor: String(picked.value) });
                        }
                    }}
                    value={accent.key}
                >
                    {ACCENT_PALETTE.map((option) => (
                        <ChoiceCards.Item
                            aria-label={copy.accents[option.key].value}
                            className="w-7 shrink-0"
                            key={option.key}
                            value={option.key}
                        >
                            <ChoiceCards.Media style={{ background: `light-dark(${option.light}, ${option.dark})` }} />
                        </ChoiceCards.Item>
                    ))}
                </ChoiceCards>
            </Row>
            <LanguageRow />
            <ToggleRow
                checked={animatedCharts}
                label={copy.animatedCharts.value}
                onChange={(next) => save({ animatedCharts: String(next) })}
            />
        </SettingsCard>
    );
}

function UpcomingCard() {
    const { upcoming: copy } = useIntlayer("dashboard-settings");
    const meta = useMeta();
    const show = metaFlag(meta, "showUpcoming", true);
    const save = useSaveSettings();
    return (
        <SettingsCard title={copy.title}>
            <ToggleRow
                checked={show}
                hint={copy.showHint}
                label={copy.show.value}
                onChange={(next) =>
                    save(next ? { showUpcoming: "true" } : { showUpcoming: "false", showUpcomingSoon: "false" })
                }
            />
            {show ? (
                <ToggleRow
                    checked={metaFlag(meta, "showUpcomingSoon", false)}
                    label={copy.soon.value}
                    onChange={(next) => save({ showUpcomingSoon: String(next) })}
                />
            ) : null}
        </SettingsCard>
    );
}

const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", es: "Español", fr: "Français", pt: "Português" };

function LanguageRow() {
    const { language } = useIntlayer("dashboard-settings");
    const { locale } = useLocale();
    const id = useId();
    return (
        <Row label={language} labelFor={id}>
            <Select
                items={DASHBOARD_LOCALES.map((value) => ({ label: LANGUAGE_NAMES[value], value }))}
                onValueChange={(next) => next && chooseDashboardLocale(next)}
                value={locale}
            >
                <Select.Trigger className="w-32" id={id}>
                    <Select.Value />
                </Select.Trigger>
                <Select.Content>
                    {DASHBOARD_LOCALES.map((value) => (
                        <Select.Item key={value} lang={LANGUAGES[value].lang} value={value}>
                            {LANGUAGE_NAMES[value]}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
        </Row>
    );
}

function PrivacyCard() {
    const { privacy: copy } = useIntlayer("dashboard-settings");
    const meta = useMeta();
    const save = useSaveSettings();
    const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);
    const aiConsent = useAiConsent();
    return (
        <SettingsCard title={copy.title}>
            <ToggleRow checked={consent === "granted"} label={copy.analytics.value} onChange={chooseConsent} />
            <ToggleRow
                checked={metaFlag(meta, "aiEnrichment", true)}
                hint={copy.smartFillHint}
                label={copy.smartFill.value}
                onChange={(next) => save({ aiEnrichment: String(next) })}
            />
            <ToggleRow
                checked={aiConsent}
                hint={copy.sendToAiHint}
                label={copy.sendToAi.value}
                onChange={chooseAiConsent}
            />
        </SettingsCard>
    );
}

const HELP_ROW =
    "border-border hover:bg-accent/40 flex min-h-14 w-full items-center gap-3 border-t px-4 text-left text-sm font-medium first:border-t-0";

function HelpCard() {
    const { help: copy } = useIntlayer("dashboard-settings");
    const about = useIntlayer("dashboard-about");
    const [suggesting, setSuggesting] = useState(false);
    return (
        <SettingsCard title={copy.title}>
            <LocalizedLink className={HELP_ROW} rel="noreferrer" target="_blank" to="/support">
                <span className="min-w-0 flex-1">{copy.contact}</span>
                <HugeiconsIcon icon={ArrowUpRight01Icon} className="text-muted-foreground size-4" />
            </LocalizedLink>
            <button className={HELP_ROW} onClick={() => setSuggesting(true)} type="button">
                <span className="min-w-0 flex-1">{about.suggest}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="text-muted-foreground size-[18px]" />
            </button>
            <SuggestDialog onClose={() => setSuggesting(false)} open={suggesting} />
        </SettingsCard>
    );
}
