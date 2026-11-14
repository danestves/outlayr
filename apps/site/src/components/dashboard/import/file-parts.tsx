import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { accountLook } from "@outlayr/money/ledger-log";
import { isoDay } from "@outlayr/money/ledger-zone";
import { Menu } from "panelui-web/menu";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useCategoryLook, useShortDay } from "@/components/dashboard/rules/parts";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { Pick, useCategoryOptions } from "@/components/dashboard/transactions/entry-form";
import { AccountTile } from "@/components/ledger/tiles";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import type { CategoryChoice } from "@/lib/import-plan";

export const NONE = "none";

interface PickOption {
    icon?: ReactNode;
    label: string;
    value: string;
}
const NO_EXTRA: readonly PickOption[] = [];

/** An instant as the ledger's own short day, "Oct 28". */
export function useEntryDay() {
    const { ledger } = useDashboard();
    const short = useShortDay();
    return (at: number) => short(isoDay(at, ledger.offsetAt(at)));
}

export function useAccountOptions() {
    const { ledger, photos } = useDashboard();
    return openAccounts(ledger.books).map((row) => ({
        icon: <AccountTile account={accountLook(row)} photos={photos} size="sm" />,
        label: row.name,
        value: row.localId,
    }));
}

export function AccountPick({
    extra = NO_EXTRA,
    onPick,
    placeholder,
    value,
}: {
    extra?: readonly PickOption[];
    onPick: (value: string) => void;
    placeholder?: string;
    value: string | null;
}) {
    const options = useAccountOptions();
    return (
        <Pick onPick={onPick} options={[...options, ...extra]} placeholder={placeholder} quiet={false} value={value} />
    );
}

/** The account an import went into, shown as the field it was picked in but no longer a choice. */
export function AccountShown({ id }: { id: string | null }) {
    const { match } = useIntlayer("dashboard-import");
    const options = useAccountOptions();
    const option = options.find((each) => each.value === id);
    return (
        <span className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium">
            {option?.icon}
            <span className="truncate">{option?.label ?? match.none}</span>
        </span>
    );
}

const CHIP =
    "inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap";

export function CategoryChip({
    choice,
    disabled = false,
    income,
    newName,
    onPick,
}: {
    choice: CategoryChoice;
    disabled?: boolean;
    income: boolean;
    /** What a new category would be called, offered when no existing one fits. */
    newName: string | null;
    onPick: (choice: CategoryChoice) => void;
}) {
    const { resolve } = useIntlayer("dashboard-import");
    const { ledger } = useDashboard();
    const look = useCategoryLook();
    const options = useCategoryOptions(ledger, income);
    const found = choice.kind === "existing" ? look(choice.id) : null;
    let face: ReactNode = <span className="text-primary">{resolve.pickCategory}</span>;
    if (found) {
        face = (
            <>
                <i className="size-1.5 flex-none rounded-full" style={{ backgroundColor: found.color }} />
                <span className="truncate">{found.name}</span>
            </>
        );
    } else if (choice.kind === "new") {
        face = (
            <>
                <i className="border-muted-foreground size-1.5 flex-none rounded-full border border-dashed" />
                <span className="truncate">{choice.name}</span>
            </>
        );
    }
    const offered = newName !== null && !options.some((option) => option.label.toLowerCase() === newName.toLowerCase());
    return (
        <Menu>
            <Menu.Trigger
                disabled={disabled}
                render={
                    <button
                        aria-label={found?.name ?? (choice.kind === "new" ? choice.name : resolve.pickCategory.value)}
                        className={`${CHIP} hover:bg-app-fill/60 disabled:opacity-50 ${choice.kind === "none" ? "border-primary/30" : ""}`}
                        type="button"
                    />
                }
            >
                {face}
                <Glyph className="text-muted-foreground flex-none" icon={ArrowDown01Icon} size={12} />
            </Menu.Trigger>
            <Menu.Content className="app-shell ph-no-capture z-[60] max-h-80 overflow-y-auto">
                {options.map((option) => (
                    <Menu.Item key={option.value} onClick={() => onPick({ id: option.value, kind: "existing" })}>
                        {option.icon}
                        {option.label}
                    </Menu.Item>
                ))}
                {offered || choice.kind !== "none" ? <Menu.Separator /> : null}
                {offered ? (
                    <Menu.Item onClick={() => onPick({ kind: "new", name: newName })}>
                        <Glyph icon={Add01Icon} size={14} />
                        {resolve.newCategory({ name: newName })}
                    </Menu.Item>
                ) : null}
                {choice.kind === "none" ? null : (
                    <Menu.Item onClick={() => onPick({ kind: "none" })}>
                        <Glyph icon={Cancel01Icon} size={14} />
                        {resolve.noCategory}
                    </Menu.Item>
                )}
            </Menu.Content>
        </Menu>
    );
}

/** A finished import's category, read only: the same chip without the menu. */
export function CategoryShown({ id }: { id: string | null }) {
    const { importing } = useIntlayer("dashboard-import");
    const look = useCategoryLook();
    const found = id === null ? null : look(id);
    if (!found) {
        return <span className={`${CHIP} border-primary/30 text-primary`}>{importing.noCategory}</span>;
    }
    return (
        <span className={CHIP}>
            <i className="size-1.5 flex-none rounded-full" style={{ backgroundColor: found.color }} />
            {found.name}
        </span>
    );
}

export function Pager({
    label,
    onNext,
    onPrevious,
    page,
    pages,
}: {
    label: ReactNode;
    onNext: () => void;
    onPrevious: () => void;
    page: number;
    pages: number;
}) {
    const { review } = useIntlayer("dashboard-import");
    return (
        <>
            <span className="text-muted-foreground">{label}</span>
            {pages > 1 ? (
                <span className="flex gap-1.5">
                    <button
                        aria-label={review.previous.value}
                        className="hover:bg-app-fill flex size-8 items-center justify-center rounded-lg border disabled:opacity-40"
                        disabled={page === 0}
                        onClick={onPrevious}
                        type="button"
                    >
                        <Glyph className="rotate-90" icon={ArrowDown01Icon} size={14} />
                    </button>
                    <button
                        aria-label={review.next.value}
                        className="hover:bg-app-fill flex size-8 items-center justify-center rounded-lg border disabled:opacity-40"
                        disabled={page >= pages - 1}
                        onClick={onNext}
                        type="button"
                    >
                        <Glyph className="-rotate-90" icon={ArrowDown01Icon} size={14} />
                    </button>
                </span>
            ) : null}
        </>
    );
}
