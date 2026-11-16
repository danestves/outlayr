import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Cause from "effect/Cause";
import { useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { AccountPickerSheet } from "@/components/account-picker-sheet";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import type { Account } from "@/data/accounts-core";
import { useNow } from "@/data/use-now";
import { formatSentenceDate } from "@/domain/dates";
import { matchedAccount, planImport, scannedStanding } from "@/domain/installment-scan";
import type { PlanStanding, ScannedOrder } from "@/domain/installment-scan";
import { formatAmount } from "@/domain/money";
import { useCreateLiability } from "@/hooks/use-pro-gate";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { InstallmentPlanDraft } from "@/lib/cloud-ai";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { BottomBar, ScanShell } from "@/screens/transaction/scan";
import { SILENT } from "@/state/atom-command";
import { importScannedOrdersCommand } from "@/state/installment-orders";
import { askForInstallmentReminders } from "@/state/surfaces-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

type Reviewed =
    | { account: Account; index: number; kind: "ready"; name: string; order: ScannedOrder; standing: PlanStanding }
    | { account: Account; index: number; kind: "foreign"; name: string; plan: string }
    | { index: number; kind: "unclear"; name: string };

function planName(plan: InstallmentPlanDraft, fallback: string): string {
    return plan.name ?? plan.provider ?? fallback;
}

export function ScanReview({
    accounts,
    fallback,
    onClose,
    onDone,
    plans,
    skipped,
}: {
    accounts: readonly Account[];
    fallback: Account;
    onClose: () => void;
    onDone: () => void;
    plans: readonly InstallmentPlanDraft[];
    skipped: readonly string[];
}) {
    const t = useTranslation();
    const db = useDatabase();
    const haptics = useHaptics();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const createLiability = useCreateLiability();
    const sheet = useRef<BottomSheetModal>(null);
    const [chosen, setChosen] = useState<Readonly<Record<number, Account>>>({});
    const [excluded, setExcluded] = useState<ReadonlySet<number>>(new Set());
    const [picking, setPicking] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState<ReadonlySet<number>>(new Set());
    const nowMs = useNow();
    const today = new Date(nowMs);
    const unnamed = t("installments.scan.review.unnamed");

    const reviewed = plans.map((plan, index): Reviewed => {
        const account = chosen[index] ?? matchedAccount(plan, accounts, fallback);
        const name = planName(plan, unnamed);
        const result = planImport(plan, account);
        if (result.kind === "foreign") {
            return { account, index, kind: "foreign", name, plan: result.currency };
        }
        const standing = result.kind === "ready" ? scannedStanding(result.order, account.currency, today) : null;
        if (result.kind === "unclear" || standing === null) {
            return { index, kind: "unclear", name };
        }
        return { account, index, kind: "ready", name, order: result.order, standing };
    });
    const ready = reviewed.filter((row) => row.kind === "ready").filter((row) => !saved.has(row.index));
    const blocked = reviewed.filter((row) => row.kind !== "ready");
    const picked = ready.filter((row) => !excluded.has(row.index));
    const currencies = new Set(picked.map((row) => row.account.currency));

    const save = useAtomAction(
        importScannedOrdersCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to import the scanned plans", Cause.squash(cause));
                haptics("error");
                notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
                setBusy(false);
            },
            onSuccess: () => {
                haptics("success");
                onDone();
                askForInstallmentReminders(db);
            },
        },
        SILENT
    );

    const toggle = (index: number) => {
        if (busy) {
            return;
        }
        setExcluded((current) => {
            const next = new Set(current);
            if (!next.delete(index)) {
                next.add(index);
            }
            return next;
        });
    };
    const pickAccount = (index: number) => {
        if (busy) {
            return;
        }
        setPicking(index);
        sheet.current?.present();
    };
    const add = () => {
        setBusy(true);
        save({
            db,
            imports: picked.map(({ account, name, order }) => ({ account, name, order })),
            onFeesFailed: () =>
                notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") }),
            onSaved: (position) => {
                const row = picked[position];
                if (row !== undefined) {
                    setSaved((current) => new Set(current).add(row.index));
                }
            },
        });
    };

    const money = (amount: number, currency: string) => formatAmount(amount, currency, showCents, language);
    const [only] = currencies;
    const total =
        currencies.size === 1 && only !== undefined
            ? t("installments.scan.review.left", {
                  amount: money(
                      picked.reduce((sum, row) => sum + row.standing.left, 0),
                      only
                  ),
              })
            : null;
    const pickingPlan = picking === null ? undefined : plans[picking];
    const pickingAccount =
        picking === null || pickingPlan === undefined
            ? null
            : (chosen[picking] ?? matchedAccount(pickingPlan, accounts, fallback));

    return (
        <>
            <ScanShell
                bottom={
                    <BottomBar
                        disabled={busy || picked.length === 0}
                        primary={{
                            label: busy
                                ? t("installments.apps.adding")
                                : t("installments.scan.review.add", { count: picked.length }),
                            onPress: add,
                        }}
                        secondary={null}
                    />
                }
                closeDisabled={busy}
                onClose={onClose}
                scroll
            >
                <Section count={t("installments.scan.review.plans", { count: ready.length })} trailing={total} />
                {ready.map((row) => (
                    <ReadyRow
                        included={!excluded.has(row.index)}
                        key={row.index}
                        money={money}
                        onAccount={() => pickAccount(row.index)}
                        onToggle={() => toggle(row.index)}
                        row={row}
                    />
                ))}
                {blocked.length + skipped.length > 0 ? (
                    <View className="mt-8">
                        <Section
                            count={t("installments.scan.review.skipped")}
                            trailing={String(blocked.length + skipped.length)}
                        />
                        {blocked.map((row) => (
                            <BlockedRow
                                key={row.index}
                                name={row.name}
                                onAccount={row.kind === "foreign" ? () => pickAccount(row.index) : null}
                                reason={
                                    row.kind === "foreign"
                                        ? t("installments.scan.currency", {
                                              account: row.account.name,
                                              currency: row.account.currency,
                                              plan: row.plan,
                                          })
                                        : t("installments.scan.review.unreadable")
                                }
                            />
                        ))}
                        {skipped.map((name, index) => (
                            <BlockedRow
                                key={`skipped-${index}`}
                                name={name}
                                onAccount={null}
                                reason={t("installments.scan.review.unreadable")}
                            />
                        ))}
                    </View>
                ) : null}
            </ScanShell>
            <AccountPickerSheet
                accounts={accounts}
                allowNone={false}
                db={db}
                onCreate={createLiability}
                onSelect={(account) => {
                    if (account !== null && picking !== null) {
                        setChosen((current) => ({ ...current, [picking]: account }));
                    }
                }}
                ref={sheet}
                selectedId={pickingAccount?.id ?? null}
            />
        </>
    );
}

function Section({ count, trailing }: { count: string; trailing: string | null }) {
    return (
        <View className="border-foreground flex-row items-baseline justify-between border-b-2 pb-2">
            <Text className="text-title font-sans-semibold text-foreground">{count}</Text>
            {trailing === null ? null : <Text className="text-muted text-body font-sans">{trailing}</Text>}
        </View>
    );
}

function Check({ on }: { on: boolean }) {
    const colors = useColors();
    return (
        <View
            className={cn(
                "size-6 items-center justify-center rounded-full",
                on ? "bg-foreground" : "border-separator border-[1.5px] border-dashed"
            )}
        >
            {on ? <HugeiconsIcon color={colors.background} icon={Tick02Icon} size={14} strokeWidth={2.4} /> : null}
        </View>
    );
}

function ReadyRow({
    included,
    money,
    onAccount,
    onToggle,
    row,
}: {
    included: boolean;
    money: (amount: number, currency: string) => string;
    onAccount: () => void;
    onToggle: () => void;
    row: Extract<Reviewed, { kind: "ready" }>;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { next, count } = row.standing;
    const daysLate = next?.daysLate ?? 0;
    const position = next === null ? null : t("installments.scan.review.position", { count, index: next.sequence });
    let due = next === null ? null : formatSentenceDate(next.dueDate, language);
    if (due !== null && daysLate > 0) {
        due = `${due}, ${t("installments.scan.review.late", { count: daysLate })}`;
    }
    const last = next !== null && daysLate <= 0 && next.sequence === count;
    return (
        <View className="border-separator flex-row items-center gap-3 border-b py-3">
            <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: included }}
                className="flex-1 flex-row items-center gap-3"
                onPress={onToggle}
            >
                <Check on={included} />
                <View className="flex-1 gap-0.5">
                    <Text
                        className={cn("text-body font-sans-medium", included ? "text-foreground" : "text-muted")}
                        numberOfLines={1}
                    >
                        {row.name}
                    </Text>
                    {due === null ? null : (
                        <Text className="text-subtitle text-muted font-sans" numberOfLines={1}>
                            {position} · <Text className={daysLate > 0 ? "text-danger" : undefined}>{due}</Text>
                            {last ? ` · ${t("installments.scan.review.last")}` : null}
                        </Text>
                    )}
                </View>
            </Pressable>
            <Pressable accessibilityRole="button" className="items-end gap-0.5" hitSlop={8} onPress={onAccount}>
                {next === null ? null : (
                    <Text className="text-body font-sans-medium text-foreground tabular-nums">
                        {money(next.amount, row.account.currency)}
                    </Text>
                )}
                <AccountLink name={row.account.name} />
            </Pressable>
        </View>
    );
}

function AccountLink({ name }: { name: string }) {
    const colors = useColors();
    return (
        <View className="flex-row items-center gap-0.5">
            <Text className="text-subtitle text-muted font-sans" numberOfLines={1}>
                {name}
            </Text>
            <HugeiconsIcon color={colors.muted} icon={ArrowRight01Icon} size={14} strokeWidth={2} />
        </View>
    );
}

function BlockedRow({ name, onAccount, reason }: { name: string; onAccount: (() => void) | null; reason: string }) {
    const body = (
        <View className="flex-1 flex-row items-center gap-3">
            <Check on={false} />
            <View className="flex-1 gap-0.5">
                <Text className="text-body text-muted font-sans-medium" numberOfLines={1}>
                    {name}
                </Text>
                <Text className="text-subtitle text-muted font-sans">{reason}</Text>
            </View>
        </View>
    );
    return (
        <View className="border-separator flex-row items-center gap-3 border-b py-3">
            {onAccount === null ? (
                body
            ) : (
                <Pressable accessibilityRole="button" className="flex-1" onPress={onAccount}>
                    {body}
                </Pressable>
            )}
        </View>
    );
}
