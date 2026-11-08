import { ACCENT_PALETTE } from "@outlayr/money/accent";
import { useContext, useSyncExternalStore } from "react";
import { useIntlayer } from "react-intlayer";

import { LedgerSettingsContext, metaFlag, useDisplayFormat, useMeta } from "@/lib/ledger-settings";
import { chooseTheme, readTheme, subscribeTheme, THEMES } from "@/lib/theme";

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
                </div>
                <div className="grid gap-4">
                    <AppearanceCard />
                    <LabCard />
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
            <Row hint={copy.themeHint} label={copy.theme}>
                <Choice
                    label={copy.theme.value}
                    onChange={chooseTheme}
                    options={THEMES.map((value) => ({ label: copy[value].value, value }))}
                    value={theme}
                />
            </Row>
            <Row hint={copy.accents[accent.key]} label={copy.accent}>
                <fieldset aria-label={copy.accent.value} className="flex gap-2">
                    {ACCENT_PALETTE.map((option) => (
                        <button
                            aria-label={copy.accents[option.key].value}
                            aria-pressed={option.key === accent.key}
                            className="dash-swatch"
                            key={option.key}
                            onClick={() => save({ accentColor: String(option.value) })}
                            style={{ color: `light-dark(${option.light}, ${option.dark})` }}
                            type="button"
                        />
                    ))}
                </fieldset>
            </Row>
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

const LAB = [
    { fallback: false, key: "confetti", label: "confetti", note: "confettiNote" },
    { fallback: false, key: "logViewLineGraph", label: "lineGraph", note: undefined },
    { fallback: true, key: "budgetViewStyle", label: "budgetRows", note: "budgetRowsNote" },
    { fallback: false, key: "swapTimeLabel", label: "swapTime", note: "swapTimeNote" },
] as const;

function LabCard() {
    const { lab: copy } = useIntlayer("dashboard-settings");
    const meta = useMeta();
    const save = useSaveSettings();
    return (
        <SettingsCard footer={<span className="text-muted-foreground">{copy.experimental}</span>} title={copy.title}>
            {LAB.map((item) => (
                <ToggleRow
                    checked={metaFlag(meta, item.key, item.fallback)}
                    hint={item.note ? copy[item.note] : undefined}
                    key={item.key}
                    label={copy[item.label].value}
                    onChange={(next) => save({ [item.key]: String(next) })}
                />
            ))}
        </SettingsCard>
    );
}
