import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor } from "@outlayr/money/currency";
import { Command } from "panelui-web/command";
import { useContext, useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LedgerSettingsContext, useDisplayFormat } from "@/lib/ledger-settings";

import { Row, SectionHead, SettingsCard, useSaveSettings } from "./parts";

interface Holding {
    accounts: string[];
    code: string;
    total: number;
}

function useHoldings() {
    const { overview } = useDashboard();
    return useMemo(() => {
        const byCode = new Map<string, Holding>();
        for (const account of overview.balances.accounts) {
            const holding = byCode.get(account.currency) ?? { accounts: [], code: account.currency, total: 0 };
            holding.accounts.push(account.name);
            holding.total += account.balance;
            byCode.set(account.currency, holding);
        }
        return [...byCode.values()].sort((a, b) => b.accounts.length - a.accounts.length);
    }, [overview.balances.accounts]);
}

export function Currency() {
    const copy = useIntlayer("dashboard-settings");
    const { currency } = useContext(LedgerSettingsContext);
    const { money } = useDisplayFormat();
    const holdings = useHoldings();
    const { currency: text } = copy;
    const main = currencyDisplayFor(currency);
    return (
        <>
            <SectionHead title={copy.sections.currency} />
            <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-2">
                <SettingsCard title={text.main}>
                    <Row hint={text.mainHint} label={`${currency} · ${main.name}`}>
                        <CurrencyPicker current={currency} inUse={holdings.map((holding) => holding.code)} />
                    </Row>
                </SettingsCard>
                <SettingsCard title={text.byCurrency}>
                    {holdings.length === 0 ? (
                        <p className="text-muted-foreground px-4 py-4 text-sm">{text.noAccounts}</p>
                    ) : (
                        holdings.map((holding) => (
                            <Row
                                hint={holding.accounts.join(", ")}
                                key={holding.code}
                                label={`${holding.code} · ${currencyDisplayFor(holding.code).name}`}
                            >
                                <span className="font-mono text-sm tabular-nums">
                                    {money(holding.total, holding.code)}
                                </span>
                            </Row>
                        ))
                    )}
                </SettingsCard>
            </div>
        </>
    );
}

function CurrencyPicker({ current, inUse }: { current: string; inUse: readonly string[] }) {
    const { currency: text } = useIntlayer("dashboard-settings");
    const save = useSaveSettings();
    const pick = (code: string) => save({ currency: code, currencyChosen: "true" });
    const item = (code: string, group: string) => {
        const { name, symbol } = currencyDisplayFor(code);
        return (
            <Command.Item
                keywords={[name, symbol]}
                key={`${group}-${code}`}
                kind={code === current ? "✓" : symbol}
                onSelect={() => pick(code)}
                subtitle={name}
                textValue={`${code} ${name}`}
                value={`${group}-${code}`}
            >
                {code}
            </Command.Item>
        );
    };
    return (
        <Command.Dialog
            hotkey={null}
            label={text.main.value}
            trigger={
                <button className="dash-btn" type="button">
                    {text.change}
                </button>
            }
        >
            <Command label={text.main.value} variant="compact">
                <Command.Input className="max-sm:text-base" placeholder={text.search.value} />
                <Command.List>
                    <Command.Empty>{text.none}</Command.Empty>
                    {inUse.length > 0 ? (
                        <Command.Group heading={text.inUse}>{inUse.map((code) => item(code, "used"))}</Command.Group>
                    ) : null}
                    <Command.Group heading={text.all}>
                        {PICKABLE_CURRENCY_CODES.map((code) => item(code, "all"))}
                    </Command.Group>
                </Command.List>
            </Command>
        </Command.Dialog>
    );
}
