import SparklesSolidIcon from "@hugeicons-pro/core-solid-rounded/SparklesIcon";
import Tag01SolidIcon from "@hugeicons-pro/core-solid-rounded/Tag01Icon";
import ArrowDataTransferVerticalIcon from "@hugeicons/core-free-icons/ArrowDataTransferVerticalIcon";
import Attachment01Icon from "@hugeicons/core-free-icons/Attachment01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import DivideSignCircleIcon from "@hugeicons/core-free-icons/DivideSignCircleIcon";
import NoteEditIcon from "@hugeicons/core-free-icons/NoteEditIcon";
import PercentCircleIcon from "@hugeicons/core-free-icons/PercentCircleIcon";
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon";
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { Locale } from "@outlayr/shared/i18n";
import type { CSSProperties, ReactNode } from "react";

import { useReplica } from "./canvas";
import { accountOf, amountOf, CATEGORY_KEYS, merchantIdentity, symbolIsShared, whenLabel } from "./entry-state";
import type { EntryState } from "./entry-state";
import { solidCategoryIcon } from "./icons";
import { categoryStyle, imageColor } from "./ledger";
import { currencyFor, formatAmount } from "./money";
import { interpolate } from "./strings";
import type { AppT } from "./strings";
import { CategoryIconTile } from "./tile";
import { roundedTrak } from "./type";

const TEXT = "font-sans-medium text-[26px] leading-[38px]";
const TEXT_SIZE = 26;
const NATIVE_TIGHT = "-0.3px";
const CHIP_TEXT = 15;
const MEASURE_SLACK = 1 / 6;
const CARET = { inset: 2, overhang: 1, width: 2 } as const;
const CHIP_RADIUS = 17;
const NATIVE_DASH = "3 3";
const HAIRLINE_INSET = -0.5;
const RULE_BOTTOM = 7;
const TILE = 20;
const SWAP_GLYPH = 13;
const CHIP_ICON = 15;
const WASH = "color-mix(in srgb, var(--tint) 13%, transparent)";
const DASHED = "repeating-linear-gradient(90deg, var(--tint) 0 6px, transparent 6px 12px)";
const DOTTED = "repeating-linear-gradient(90deg, var(--grammar) 0 1.33px, transparent 1.33px 2px)";
const PLACEHOLDER = /\{(\w+)\}/g;
const WHITESPACE = /(\s+)/;

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

const KERNED: CustomStyle = {
    "--app-kern": NATIVE_TIGHT,
    "--app-trak": roundedTrak(TEXT_SIZE),
    marginInlineEnd: MEASURE_SLACK,
};
const CHIP_TRAK: CustomStyle = { "--app-trak": roundedTrak(CHIP_TEXT) };

function Words({ children, className }: { children: string; className: string }) {
    return (
        <span className={`${TEXT} ${className}`} data-app-kern="" style={KERNED}>
            {children}
        </span>
    );
}

interface SentenceAtom {
    readonly kind: "slot" | "text";
    readonly value: string;
}

function parseSentence(template: string): readonly (readonly SentenceAtom[])[] {
    const clusters: SentenceAtom[][] = [];
    let current: SentenceAtom[] = [];
    const breakCluster = () => {
        if (current.length > 0) {
            clusters.push(current);
            current = [];
        }
    };
    const pushText = (text: string) => {
        for (const piece of text.split(WHITESPACE)) {
            if (piece.trim() === "") {
                if (piece !== "") {
                    breakCluster();
                }
                continue;
            }
            current.push({ kind: "text", value: piece });
        }
    };
    let cursor = 0;
    for (const match of template.matchAll(PLACEHOLDER)) {
        pushText(template.slice(cursor, match.index));
        current.push({ kind: "slot", value: match[1] ?? "" });
        cursor = match.index + match[0].length;
    }
    pushText(template.slice(cursor));
    breakCluster();
    return clusters;
}

function Wash() {
    return (
        <div
            className="absolute"
            style={{ background: WASH, borderRadius: 7, bottom: 2, left: -5, right: -5, top: 5 }}
        />
    );
}

function Rule({ background = "var(--tint)", height = 2 }: { background?: string; height?: number }) {
    return <div className="absolute inset-x-0 rounded-full" style={{ background, bottom: RULE_BOTTOM, height }} />;
}

function Blank({ active, label, optional }: { active: boolean; label: string; optional: boolean }) {
    let tone = "text-foreground";
    let rule = <Rule background={DASHED} />;
    if (active) {
        rule = <Rule />;
    } else if (optional) {
        tone = "text-grammar";
        rule = <Rule background={DOTTED} height={1} />;
    }
    return (
        <div>
            {active ? <Wash /> : null}
            <Words className={tone}>{label}</Words>
            {rule}
        </div>
    );
}

function Value({ active, children, value }: { active: boolean; children?: ReactNode; value: string }) {
    return (
        <div>
            {active ? <Wash /> : null}
            <div className="flex-row items-baseline gap-1.5">
                {children}
                <Words className="text-foreground">{value}</Words>
            </div>
            <Rule />
        </div>
    );
}

function Toggle({ value }: { value: string }) {
    return (
        <div>
            <div className="flex-row items-baseline gap-1.5">
                <Words className="text-foreground">{value}</Words>
                <HugeiconsIcon color="var(--tint)" icon={ArrowDataTransferVerticalIcon} size={SWAP_GLYPH} />
            </div>
            <Rule />
        </div>
    );
}

function Input({ placeholder, value }: { placeholder: string; value: string }) {
    return (
        <div className="shrink flex-row items-baseline gap-1.5">
            <Wash />
            <div className="shrink flex-row items-baseline">
                <Words className={`pr-0.5 ${value === "" ? "text-muted" : "text-foreground"}`}>
                    {value === "" ? placeholder : value}
                </Words>
                <div
                    className="bg-tint absolute rounded-full"
                    data-entry-caret=""
                    style={{
                        bottom: CARET.inset,
                        left: value === "" ? 0 : undefined,
                        right: value === "" ? undefined : CARET.overhang,
                        top: CARET.inset,
                        width: CARET.width,
                    }}
                />
            </div>
            <Rule />
        </div>
    );
}

function amountText(state: EntryState, locale: Locale) {
    const amount = amountOf(state);
    return amount === null ? null : formatAmount(amount, currencyFor(locale), locale);
}

export function sentenceText(state: EntryState, now: Date, locale: Locale, t: AppT): string {
    const account = accountOf(state.account);
    const code = currencyFor(locale);
    const amount = amountText(state, locale) ?? formatAmount(0, code, locale);
    return interpolate(t("transaction.sentence.expense"), {
        account: account?.name ?? t("transaction.sentence.blank.account"),
        amount: symbolIsShared(code) ? `${amount} ${code}` : amount,
        category: state.category === null ? t("transaction.sentence.blank.category") : t(CATEGORY_KEYS[state.category]),
        kind: t("transaction.sentence.kind.expense"),
        merchant: state.name === "" ? t("transaction.sentence.blank.merchant") : state.name,
        when: whenLabel(state, now, locale, t),
    });
}

function AmountSlot({ state }: { state: EntryState }) {
    const { locale } = useReplica();
    const code = currencyFor(locale);
    const amount = amountText(state, locale);
    const active = state.active === "amount";
    return (
        <div className="flex-row items-baseline gap-1.5">
            {amount === null ? (
                <Blank active={active} label={formatAmount(0, code, locale)} optional={false} />
            ) : (
                <Value active={active} value={amount} />
            )}
            {symbolIsShared(code) ? (
                <div>
                    <span className="text-tint text-footnote font-mono" style={{ marginInlineEnd: MEASURE_SLACK }}>
                        {code}
                    </span>
                </div>
            ) : null}
        </div>
    );
}

function MerchantSlot({ state }: { state: EntryState }) {
    const { t } = useReplica();
    const identity = merchantIdentity(state.name);
    const tile = identity?.logo ? (
        <CategoryIconTile
            color={imageColor(identity.logo) ?? "var(--foreground)"}
            icon={null}
            logo={identity.logo}
            size={TILE}
        />
    ) : null;
    if (state.surface === "keyboard") {
        return <Input placeholder={t("transaction.sentence.blank.merchant")} value={state.name} />;
    }
    if (state.name === "") {
        return <Blank active={state.active === "merchant"} label={t("transaction.sentence.blank.merchant")} optional />;
    }
    return (
        <Value active={state.active === "merchant"} value={state.name}>
            {tile}
        </Value>
    );
}

function CategorySlot({ state }: { state: EntryState }) {
    const { t } = useReplica();
    const active = state.active === "category";
    if (state.category === null) {
        return <Blank active={active} label={t("transaction.sentence.blank.category")} optional={false} />;
    }
    const style = categoryStyle(state.category);
    return (
        <Value active={active} value={t(CATEGORY_KEYS[state.category])}>
            <HugeiconsIcon color={style.color} icon={solidCategoryIcon(style.icon)} size={TILE} />
        </Value>
    );
}

function AccountSlot({ state }: { state: EntryState }) {
    const { t } = useReplica();
    const account = accountOf(state.account);
    const active = state.active === "account";
    if (account === null) {
        return <Blank active={active} label={t("transaction.sentence.blank.account")} optional />;
    }
    return (
        <Value active={active} value={account.name}>
            <CategoryIconTile
                color={imageColor(account.logo) ?? account.color}
                icon={account.icon}
                logo={account.logo}
                size={TILE}
            />
        </Value>
    );
}

function slotFor(name: string, state: EntryState, when: string, verb: string): ReactNode {
    switch (name) {
        case "kind": {
            return <Toggle value={verb} />;
        }
        case "amount": {
            return <AmountSlot state={state} />;
        }
        case "merchant": {
            return <MerchantSlot state={state} />;
        }
        case "category": {
            return <CategorySlot state={state} />;
        }
        case "account": {
            return <AccountSlot state={state} />;
        }
        case "when": {
            return <Value active={false} value={when} />;
        }
        default: {
            return null;
        }
    }
}

export function EntrySentence({ now, state }: { now: Date; state: EntryState }) {
    const { locale, t } = useReplica();
    const when = whenLabel(state, now, locale, t);
    const verb = t("transaction.sentence.kind.expense");
    return (
        <div className="flex-row flex-wrap items-baseline gap-x-2">
            {parseSentence(t("transaction.sentence.expense")).map((cluster, index) => (
                <div
                    className="shrink flex-row items-baseline"
                    key={`${index}:${cluster.map((atom) => atom.value).join(",")}`}
                >
                    {cluster.map((atom, atomIndex) =>
                        atom.kind === "slot" ? (
                            <div className="shrink" key={`${atomIndex}:${atom.value}`}>
                                {slotFor(atom.value, state, when, verb)}
                            </div>
                        ) : (
                            <Words className="text-grammar" key={`${atomIndex}:${atom.value}`}>
                                {atom.value}
                            </Words>
                        )
                    )}
                </div>
            ))}
        </div>
    );
}

interface FactChip {
    active: boolean;
    closable: boolean;
    disabled: boolean;
    glyph: IconSvgElement;
    key: string;
    label: string;
}

const plainChip = (key: string, label: string, glyph: IconSvgElement): FactChip => ({
    active: false,
    closable: false,
    disabled: false,
    glyph,
    key,
    label,
});

function factChips(state: EntryState, t: AppT): FactChip[] {
    const identity = merchantIdentity(state.name);
    const tags = identity?.tags ?? [];
    return [
        identity?.logo
            ? {
                  ...plainChip("icon", t("transaction.sentence.add.icon"), SparklesSolidIcon),
                  active: true,
                  closable: true,
              }
            : plainChip("icon", t("transaction.sentence.add.icon"), SparklesIcon),
        tags.length > 0
            ? { ...plainChip("tags", tags.map((tag) => t(tag)).join(", "), Tag01SolidIcon), active: true }
            : plainChip("tags", t("transaction.sentence.add.tags"), Tag01Icon),
        {
            ...plainChip("split", t("transaction.sentence.add.split"), DivideSignCircleIcon),
            disabled: amountOf(state) === null,
        },
        plainChip("repeat", t("transaction.sentence.add.repeat"), RepeatIcon),
        plainChip("note", t("transaction.sentence.add.note"), NoteEditIcon),
        plainChip("attach", t("transaction.sentence.add.attach"), Attachment01Icon),
        plainChip("fee", t("transaction.sentence.add.fee"), PercentCircleIcon),
    ];
}

function DashedOutline() {
    return (
        <svg
            className="absolute"
            fill="none"
            overflow="visible"
            style={{
                height: `calc(100% + ${-2 * HAIRLINE_INSET}px)`,
                left: HAIRLINE_INSET,
                top: HAIRLINE_INSET,
                width: `calc(100% + ${-2 * HAIRLINE_INSET}px)`,
            }}
        >
            <rect
                height="100%"
                rx={CHIP_RADIUS + HAIRLINE_INSET}
                stroke="var(--separator)"
                strokeDasharray={NATIVE_DASH}
                width="100%"
            />
        </svg>
    );
}

export function FactChips({ state }: { state: EntryState }) {
    const { t } = useReplica();
    return (
        <div className="mt-7 flex-row flex-wrap gap-2">
            {factChips(state, t).map((chip) => (
                <div
                    className={`min-h-[34px] flex-row items-center gap-[7px] self-start rounded-full border px-3.5 ${chip.closable ? "pe-1" : ""} ${chip.active ? "border-tint bg-tint" : ""} ${chip.disabled ? "opacity-40" : ""}`}
                    key={chip.key}
                    style={chip.active ? undefined : { borderColor: "transparent" }}
                >
                    {chip.active ? null : <DashedOutline />}
                    <HugeiconsIcon
                        color={chip.active ? "#ffffff" : "var(--muted)"}
                        icon={chip.glyph}
                        size={CHIP_ICON}
                    />
                    <span
                        className={`font-sans-medium text-[15px] leading-[21px] ${chip.active ? "text-accent-foreground" : "text-muted"}`}
                        style={CHIP_TRAK}
                    >
                        {chip.label}
                    </span>
                    {chip.closable ? (
                        <div className="-me-1 aspect-square h-6 items-center justify-center rounded-full opacity-70">
                            <HugeiconsIcon
                                color="var(--accent-foreground)"
                                icon={Cancel01Icon}
                                size={CHIP_ICON}
                                strokeWidth={2}
                            />
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
