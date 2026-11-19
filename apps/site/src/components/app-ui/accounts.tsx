import type { Locale } from "@outlayr/shared/i18n";
import { getIntlayer } from "intlayer";
import type { CSSProperties, ReactNode } from "react";

import add from "../../../../native/assets/toolbar-symbols/add.svg?url";
import reorder from "../../../../native/assets/toolbar-symbols/reorder.svg?url";
import { displayOrder } from "../../../../native/src/domain/account-order";
import { AppFragment, AppScreen, useLedger, useReplica } from "./canvas";
import type { CanvasProps } from "./canvas";
import { SymbolMask, SystemText, TabBar } from "./chrome";
import type { AccountId, DemoAccount, Ledger } from "./ledger";
import { formatAmount, formatSignedAmount } from "./money";
import { interpolate } from "./strings";
import type { AppKey } from "./strings";
import { CategoryIconTile } from "./tile";
import { fontAscent, roundedTrak, textLineHeight } from "./type";

type Account = DemoAccount;

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

const CARD = { left: 16, radius: 26, width: 370 } as const;
const ROW = { gap: 12, inset: 16, padY: 15.05, tile: 34 } as const;
const TYPE = { amount: 15, detail: 15, eyebrow: 11, name: 17, total: 22 } as const;
const STACK_GAP = { name: 1, total: 2 } as const;
const TOTALS_GAP = 16;
const SEPARATOR = { dark: "#3f3c3a", light: "#e1e0dc" } as const;
const CHEVRON = { height: 14, width: 10 } as const;
const MONO = { ascent: 1.005, line: 1.3 } as const;
const INK = "var(--title-ink)";

const TITLE = { baseline: 90.3, size: 17, weight: 590 } as const;
const TOOLBAR = { gap: 8, icon: 22, item: 44, left: 290, top: 62 } as const;
const GLASS_EDGE = "0 0 0 0.67px var(--glass-edge), 0 2px 8px var(--glass-shadow), inset 0 0 0 0.67px var(--glass-rim)";

const PICKER = {
    height: 32,
    inset: 2,
    label: 13,
    labelBaseline: 147.67,
    thumb: 181,
    top: 126.67,
} as const;
const PICKER_WEIGHT = { selected: 500, unselected: 400 } as const;
const PICKER_INK = {
    dark: { thumb: "#626063", track: "#272525" },
    light: { thumb: "#ffffff", track: "#e3e1dd" },
} as const;

const LAYOUT = {
    assetsCard: 331.33,
    assetsHeader: 318.33,
    debtsCard: 799,
    debtsHeader: 786,
    totals: 203,
} as const;

const ACCOUNT_ROW_HEIGHT = 2 * ROW.padY + textLineHeight(TYPE.name) + STACK_GAP.name + textLineHeight(TYPE.detail);
const DEBT_ROW_HEIGHT = 2 * ROW.padY + Math.max(ROW.tile, textLineHeight(TYPE.name));

const FULL_ASSET_ROWS = 6;

const accountById = (ledger: Ledger, id: AccountId): Account => {
    const account = ledger.accounts.find((candidate) => candidate.id === id);
    if (!account) {
        throw new Error(`No demo account ${id}.`);
    }
    return account;
};

const assetRows = (ledger: Ledger) => displayOrder(ledger.accountsOverview().rows, false, ledger.toLocal);
const debtRows = (ledger: Ledger) =>
    displayOrder(
        ledger.accounts.filter((account) => account.kind === "liability"),
        false,
        (account) => -ledger.toLocal(account)
    );

const balanceText = (account: Account, locale: Locale) => formatSignedAmount(account.balance, account.currency, locale);

const debtText = (account: Account, locale: Locale) =>
    formatAmount(Math.abs(account.balance), account.currency, locale);

const listed = (rows: readonly Account[], text: (account: Account) => string) =>
    rows.map((account) => `${account.name} ${text(account)}`).join(", ");

const labels = (locale: Locale) => getIntlayer("appUi", locale).labels;

function SwiftLine({
    children,
    className,
    ink,
    size,
    weight = 400,
}: {
    children: ReactNode;
    className?: string;
    ink?: string;
    size: number;
    weight?: number;
}) {
    const style: CustomStyle = {
        "--app-trak": roundedTrak(size),
        color: ink,
        fontSize: size,
        fontWeight: weight,
        lineHeight: `${textLineHeight(size)}px`,
        paddingBottom: 0,
        whiteSpace: "nowrap",
    };
    return (
        <div>
            <span className={className} style={style}>
                {children}
            </span>
        </div>
    );
}

function Eyebrow({ baseline, children }: { baseline: number; children: string }) {
    return (
        <div className="absolute" style={{ left: CARD.left + ROW.inset, top: baseline - MONO.ascent * TYPE.eyebrow }}>
            <span
                className="text-eyebrow tracking-eyebrow text-muted font-mono uppercase"
                style={{ lineHeight: `${MONO.line * TYPE.eyebrow}px`, whiteSpace: "nowrap" }}
            >
                {children}
            </span>
        </div>
    );
}

function Chevron() {
    return (
        <svg
            className="text-muted"
            fill="none"
            height={CHEVRON.height}
            viewBox={`0 0 ${CHEVRON.width} ${CHEVRON.height}`}
            width={CHEVRON.width}
        >
            <path
                d="M3.67 2.67 8.33 7.33 3.67 12"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
            />
        </svg>
    );
}

function RowShell({ account, children, separated }: { account: Account; children: ReactNode; separated: boolean }) {
    const { ledger, theme } = useReplica();
    return (
        <div
            className="flex-row items-center"
            style={{ gap: ROW.gap, paddingBlock: ROW.padY, paddingInline: ROW.inset }}
        >
            <CategoryIconTile
                color={ledger.imageColor(account.logo) ?? account.color}
                icon={account.icon}
                logo={account.logo}
                size={ROW.tile}
            />
            {children}
            <Chevron />
            {separated ? (
                <div
                    className="absolute bottom-0"
                    style={{
                        background: SEPARATOR[theme],
                        height: 1,
                        left: ROW.inset + ROW.tile + ROW.gap,
                        right: ROW.inset,
                    }}
                />
            ) : null}
        </div>
    );
}

function AccountRow({ account, separated = false }: { account: Account; separated?: boolean }) {
    const { locale } = useReplica();
    return (
        <RowShell account={account} separated={separated}>
            <div className="flex-1" style={{ gap: STACK_GAP.name }}>
                <SwiftLine ink={INK} size={TYPE.name} weight={600}>
                    {account.name}
                </SwiftLine>
                <SwiftLine className="text-muted" size={TYPE.detail}>
                    {account.currency}
                </SwiftLine>
            </div>
            <SwiftLine className="tabular-nums" ink={INK} size={TYPE.amount} weight={500}>
                {balanceText(account, locale)}
            </SwiftLine>
        </RowShell>
    );
}

function DebtRow({ account, separated = false }: { account: Account; separated?: boolean }) {
    const { locale } = useReplica();
    return (
        <RowShell account={account} separated={separated}>
            <div className="flex-1">
                <SwiftLine ink={INK} size={TYPE.name} weight={600}>
                    {account.name}
                </SwiftLine>
            </div>
            <SwiftLine className="tabular-nums" ink={INK} size={TYPE.amount} weight={500}>
                {debtText(account, locale)}
            </SwiftLine>
        </RowShell>
    );
}

function Card({ children, top }: { children: ReactNode; top?: number }) {
    const placed: CSSProperties = top === undefined ? {} : { left: CARD.left, position: "absolute", top };
    return (
        <div className="bg-surface overflow-hidden" style={{ ...placed, borderRadius: CARD.radius, width: CARD.width }}>
            {children}
        </div>
    );
}

function AssetsCard({ top }: { top?: number }) {
    const rows = assetRows(useReplica().ledger);
    return (
        <Card top={top}>
            {rows.map((account, index) => (
                <AccountRow account={account} key={account.id} separated={index < rows.length - 1} />
            ))}
        </Card>
    );
}

function DebtsCard({ top }: { top: number }) {
    const rows = debtRows(useReplica().ledger);
    return (
        <Card top={top}>
            {rows.map((account, index) => (
                <DebtRow account={account} key={account.id} separated={index < rows.length - 1} />
            ))}
        </Card>
    );
}

function Picker() {
    const { t, theme } = useReplica();
    const ink = PICKER_INK[theme];
    const half = CARD.width / 2;
    const segments = [
        { key: "balances.view.accounts", left: CARD.left, weight: PICKER_WEIGHT.selected },
        { key: "balances.view.categories", left: CARD.left + half, weight: PICKER_WEIGHT.unselected },
    ] as const satisfies readonly { key: AppKey; left: number; weight: number }[];
    return (
        <>
            <div
                className="absolute"
                style={{
                    background: ink.track,
                    borderRadius: PICKER.height / 2,
                    height: PICKER.height,
                    left: CARD.left,
                    top: PICKER.top,
                    width: CARD.width,
                }}
            />
            <div
                className="absolute"
                style={{
                    background: ink.thumb,
                    borderRadius: PICKER.height / 2 - PICKER.inset,
                    height: PICKER.height - 2 * PICKER.inset,
                    left: CARD.left + PICKER.inset,
                    top: PICKER.top + PICKER.inset,
                    width: PICKER.thumb,
                }}
            />
            {segments.map((segment) => (
                <div
                    className="absolute items-center"
                    key={segment.key}
                    style={{
                        color: INK,
                        left: segment.left,
                        top: PICKER.labelBaseline - fontAscent(PICKER.label),
                        width: half,
                    }}
                >
                    <SystemText size={PICKER.label} weight={segment.weight}>
                        {t(segment.key)}
                    </SystemText>
                </div>
            ))}
        </>
    );
}

function Totals() {
    const { ledger, locale, t } = useReplica();
    const code = ledger.currency;
    const totals = [
        { amount: ledger.accountsOverview().total, key: "accounts.totals.have" },
        { amount: ledger.youOwe(), key: "accounts.totals.owe" },
    ] as const satisfies readonly { amount: number; key: AppKey }[];
    return (
        <Card top={LAYOUT.totals}>
            <div
                className="flex-row items-start justify-between"
                style={{ gap: TOTALS_GAP, paddingBlock: ROW.padY, paddingInline: ROW.inset }}
            >
                {totals.map((total) => (
                    <div key={total.key} style={{ gap: STACK_GAP.total }}>
                        <SwiftLine className="text-muted" size={TYPE.detail}>
                            {t(total.key)}
                        </SwiftLine>
                        <SwiftLine className="tabular-nums" ink={INK} size={TYPE.total} weight={600}>
                            {formatSignedAmount(total.amount, code, locale)}
                        </SwiftLine>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function Header() {
    const { t } = useReplica();
    return (
        <>
            <div
                className="absolute inset-x-0 items-center"
                style={{ color: INK, top: TITLE.baseline - fontAscent(TITLE.size) }}
            >
                <SystemText size={TITLE.size} weight={TITLE.weight}>
                    {t("balances.title")}
                </SystemText>
            </div>
            <div
                className="absolute flex-row"
                style={{
                    background: "var(--glass-fill)",
                    borderRadius: TOOLBAR.item / 2,
                    boxShadow: GLASS_EDGE,
                    gap: TOOLBAR.gap,
                    left: TOOLBAR.left,
                    top: TOOLBAR.top,
                }}
            >
                {[reorder, add].map((symbol) => (
                    <div
                        className="items-center justify-center"
                        key={symbol}
                        style={{ height: TOOLBAR.item, width: TOOLBAR.item }}
                    >
                        <SymbolMask color="var(--glass-ink)" size={TOOLBAR.icon} src={symbol} />
                    </div>
                ))}
            </div>
        </>
    );
}

function SectionHeaders({ shift }: { shift: number }) {
    const { ledger, t } = useReplica();
    return (
        <>
            <Eyebrow baseline={LAYOUT.assetsHeader}>
                {t("accounts.census", { count: ledger.accountsOverview().count })}
            </Eyebrow>
            <Eyebrow baseline={LAYOUT.debtsHeader - shift}>{t("debts.title")}</Eyebrow>
        </>
    );
}

function accountsLabel(ledger: Ledger, locale: Locale): string {
    return interpolate(labels(locale).accountsScreen, {
        accounts: listed(assetRows(ledger), (account) => balanceText(account, locale)),
        debts: listed(debtRows(ledger), (account) => debtText(account, locale)),
        have: formatSignedAmount(ledger.accountsOverview().total, ledger.currency, locale),
        owe: formatSignedAmount(ledger.youOwe(), ledger.currency, locale),
    });
}

export function AccountsScreen(canvas: CanvasProps) {
    const ledger = useLedger();
    const shift = (FULL_ASSET_ROWS - assetRows(ledger).length) * ACCOUNT_ROW_HEIGHT;
    return (
        <AppScreen {...canvas} label={accountsLabel(ledger, canvas.locale)}>
            <div className="bg-grouped-background absolute inset-0" />
            <Picker />
            <Totals />
            <SectionHeaders shift={shift} />
            <AssetsCard top={LAYOUT.assetsCard} />
            <DebtsCard top={LAYOUT.debtsCard - shift} />
            <Header />
            <TabBar badges={{ balances: 1 }} selected="balances" />
        </AppScreen>
    );
}

export function AccountsListFragment(canvas: CanvasProps) {
    const rows = assetRows(useLedger());
    const label = interpolate(labels(canvas.locale).accountsList, {
        accounts: listed(rows, (account) => balanceText(account, canvas.locale)),
    });
    return (
        <AppFragment {...canvas} height={rows.length * ACCOUNT_ROW_HEIGHT} label={label} width={CARD.width}>
            <AssetsCard />
        </AppFragment>
    );
}

export function AccountRowFragment({ account, ...canvas }: CanvasProps & { account: AccountId }) {
    const row = accountById(useLedger(), account);
    const label = interpolate(labels(canvas.locale).accountRow, {
        amount: balanceText(row, canvas.locale),
        code: row.currency,
        name: row.name,
    });
    return (
        <AppFragment {...canvas} height={ACCOUNT_ROW_HEIGHT} label={label} width={CARD.width}>
            <div className="bg-surface absolute inset-0" />
            <AccountRow account={row} />
        </AppFragment>
    );
}

export function DebtRowFragment({ account, ...canvas }: CanvasProps & { account: AccountId }) {
    const row = accountById(useLedger(), account);
    const label = interpolate(labels(canvas.locale).cardRow, {
        amount: debtText(row, canvas.locale),
        name: row.name,
    });
    return (
        <AppFragment {...canvas} height={DEBT_ROW_HEIGHT} label={label} width={CARD.width}>
            <div className="bg-surface absolute inset-0" />
            <DebtRow account={row} />
        </AppFragment>
    );
}
