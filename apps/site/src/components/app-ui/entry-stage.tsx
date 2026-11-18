import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

import { AmountNumpad, CurrencyPill } from "./amount-pad";
import { SCREEN, useReplica } from "./canvas";
import { CATEGORY_KEYS, ENTRY_CATEGORIES, footerSaves, merchantNames, pickerAccounts, stageStep } from "./entry-state";
import type { EntryState } from "./entry-state";
import { KEYBOARD_TOP } from "./keyboard";
import { categoryStyle, imageColor } from "./ledger";
import { CategoryIconTile } from "./tile";

const TILE = 22;
const LIST_HEIGHT = 176;
const BACK_GLYPH = 19;
const SELECTED_FILL = "color-mix(in srgb, var(--tint) 13%, transparent)";
const LEDGER_CURRENCY = "USD";
const BACK_GLASS = {
    background: "var(--glass-fill)",
    boxShadow: [1, 1, -1, -1].map((side) => `inset 0 ${side}px 1.33px var(--glass-rim)`).join(", "),
} as const;

function StageOption({
    label,
    leading,
    selected = false,
    trailing,
}: {
    label: string;
    leading?: ReactNode;
    selected?: boolean;
    trailing?: ReactNode;
}) {
    return (
        <div className="max-w-full shrink-0">
            <div
                className="min-h-[38px] flex-row items-center gap-2 rounded-[19px] border px-3.5 py-1.5"
                style={{
                    background: selected ? SELECTED_FILL : "transparent",
                    borderColor: selected ? "var(--tint)" : "var(--separator)",
                }}
            >
                {leading}
                <span className="text-foreground text-subtitle shrink">{label}</span>
                {trailing}
            </div>
        </div>
    );
}

function OptionList({ children }: { children: ReactNode }) {
    return (
        <div className="overflow-hidden" style={{ maxHeight: LIST_HEIGHT }}>
            <div className="flex-row flex-wrap gap-2">{children}</div>
        </div>
    );
}

function CategoryStep({ state }: { state: EntryState }) {
    const { t } = useReplica();
    return (
        <OptionList>
            {ENTRY_CATEGORIES.map((name) => {
                const style = categoryStyle(name);
                return (
                    <StageOption
                        key={name}
                        label={t(CATEGORY_KEYS[name])}
                        leading={<CategoryIconTile color={style.color} icon={style.icon} radius={6} size={TILE} />}
                        selected={state.category === name}
                    />
                );
            })}
            <StageOption label={t("categories.addCategory")} />
        </OptionList>
    );
}

function AccountStep({ state }: { state: EntryState }) {
    const { t } = useReplica();
    return (
        <OptionList>
            <StageOption label={t("transaction.account.none")} selected={state.account === null} />
            {pickerAccounts().map((account) => (
                <StageOption
                    key={account.id}
                    label={account.name}
                    leading={
                        <CategoryIconTile
                            color={imageColor(account.logo) ?? account.color}
                            icon={account.icon}
                            logo={account.logo}
                            radius={6}
                            size={TILE}
                        />
                    }
                    selected={state.account === account.id}
                    trailing={
                        account.currency === LEDGER_CURRENCY ? null : (
                            <span className="text-label text-tint font-mono">{account.currency}</span>
                        )
                    }
                />
            ))}
        </OptionList>
    );
}

function MerchantChips({ state }: { state: EntryState }) {
    return (
        <div className="flex-row gap-2 overflow-hidden">
            {merchantNames(state.name).map((name) => (
                <StageOption key={name} label={name} selected={name === state.name} />
            ))}
        </div>
    );
}

function StageHeader({ back, right, title }: { back: boolean; right?: ReactNode; title?: string }) {
    return (
        <div className="h-[38px] flex-row items-center">
            {back ? (
                <div className="h-[38px] w-[38px] items-center justify-center rounded-full" style={BACK_GLASS}>
                    <HugeiconsIcon color="var(--foreground)" icon={ArrowLeft01Icon} size={BACK_GLYPH} />
                </div>
            ) : null}
            {title === undefined ? null : (
                <div className="absolute right-0 left-0 items-center">
                    <span className="font-sans-semibold text-foreground text-callout">{title}</span>
                </div>
            )}
            {right === undefined ? null : <div className="ml-auto">{right}</div>}
        </div>
    );
}

function StageFooter({ state }: { state: EntryState }) {
    const { t } = useReplica();
    const saves = footerSaves(state);
    return (
        <div
            className={`mt-4 min-h-[48px] items-center justify-center rounded-[14px] px-4 py-2 ${saves ? "bg-tint" : "bg-surface-secondary"}`}
        >
            <span
                className={`font-sans-semibold text-callout text-center ${saves ? "text-accent-foreground" : "text-muted"}`}
            >
                {saves ? t("transaction.cta.add") : t("common.next")}
            </span>
        </div>
    );
}

export function EntryStage({ state }: { state: EntryState }) {
    const { t } = useReplica();
    const step = stageStep(state);
    if (step === "merchant") {
        return (
            <div
                className="absolute inset-x-0 px-5 pt-2"
                style={{ bottom: SCREEN.height - KEYBOARD_TOP, paddingBottom: 12 }}
            >
                <MerchantChips state={state} />
            </div>
        );
    }
    let header = <StageHeader back={false} right={<CurrencyPill />} />;
    let body = <AmountNumpad />;
    if (step === "category") {
        header = <StageHeader back title={t("transaction.field.category")} />;
        body = <CategoryStep state={state} />;
    } else if (step === "account") {
        header = <StageHeader back title={t("transaction.field.account")} />;
        body = <AccountStep state={state} />;
    }
    return (
        <div className="border-separator bg-background absolute inset-x-0 bottom-0 border-t px-5 pt-[15px] pb-[34px]">
            {header}
            <div className="pt-3">{body}</div>
            <StageFooter state={state} />
        </div>
    );
}
