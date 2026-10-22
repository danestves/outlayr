import { BottomSheetModal, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import MinusSignIcon from "@hugeicons-pro/core-stroke-rounded/MinusSignIcon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SHEET_CARD_GAP, SHEET_TOP_PADDING } from "@/components/currency-picker-sheet";
import { ChoiceRow } from "@/components/list/list-row";
import { revealEntering } from "@/components/sentence/sentence-motion";
import { formatSentenceDate, formatTargetDate } from "@/domain/dates";
import { EVERY_ORDER, MAX_INSTALLMENT_COUNT, rescheduled } from "@/domain/installment-draft";
import type { ScheduledInstallment } from "@/domain/installments";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useLanguage, useTranslation } from "@/i18n/context";
import { CompactDatePicker } from "@/screens/budgets/components/compact-date-picker";
import { EditorRow } from "@/screens/budgets/components/editor-row";
import { MenuRow } from "@/screens/installments/menu-row";
import { useColors } from "@/theme/use-colors";

import { SheetGestureRoot } from "../sheet-gesture-root";
import { Text } from "../text";
import { InstallmentsPad, NONE, useInstallmentsSheetForm } from "./installments-sheet-form";
import type { InstallmentsSheetProps } from "./installments-sheet-form";

export function InstallmentsSheet(props: InstallmentsSheetProps) {
    const { accounts, currency, draft, onChange, purchaseDay, ref, schedule } = props;
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const sheetSurface = useSheetSurface();
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const form = useInstallmentsSheetForm(props);
    const { each, emptyNote, firstDue, from, money, open, openPad, over, paidBefore, setOpen, step, total, upfront } =
        form;

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            enablePanDownToClose
            ref={ref}
        >
            <SheetGestureRoot style={{}}>
                <BottomSheetScrollView
                    contentContainerStyle={{ paddingBottom: 36, paddingHorizontal: 20, paddingTop: 8 }}
                    showsVerticalScrollIndicator={false}
                    // The sheet fits its content, so a long schedule would outgrow the screen; capped, it scrolls.
                    style={{
                        maxHeight: windowHeight - insets.top - insets.bottom - SHEET_CARD_GAP - SHEET_TOP_PADDING,
                    }}
                >
                    <Text accessibilityRole="header" className="text-foreground text-center text-lg font-medium">
                        {t("installments.chip")}
                    </Text>
                    <Text className="text-muted text-subtitle pb-3 text-center">{form.summary}</Text>
                    <View className="border-border border-t">
                        <View className="border-border border-b py-3">
                            <Pressable
                                accessibilityRole="button"
                                className="flex-row items-center gap-3 active:opacity-60"
                                onPress={() => openPad("upfront", upfront)}
                            >
                                <Text className="text-body text-foreground flex-1">{t("installments.paidNow")}</Text>
                                <Text className="text-body text-muted tabular-nums">{money(upfront)}</Text>
                            </Pressable>
                            <View className="flex-row gap-1.5 pt-2">
                                {form.shares.map((share) => (
                                    <ShareOption key={share.label} {...share} />
                                ))}
                            </View>
                        </View>

                        {upfront > 0 ? (
                            <MenuRow
                                label={t("installments.from")}
                                onPick={(id) => onChange({ ...draft, upfrontAccountId: id === NONE ? null : id })}
                                options={[
                                    { id: NONE, title: t("installments.from.none") },
                                    ...accounts.map((account) => ({ id: account.id, title: account.name })),
                                ]}
                                selected={from?.id ?? NONE}
                                value={
                                    from
                                        ? from.name
                                        : `${t("installments.from.none")} · ${t("installments.notFromAccount")}`
                                }
                            />
                        ) : null}

                        <View className="border-border flex-row items-center gap-3 border-b py-2">
                            <Text className="text-body text-foreground flex-1">{t("installments.then")}</Text>
                            <Pressable
                                accessibilityLabel="−"
                                accessibilityRole="button"
                                className="p-2 active:opacity-60"
                                disabled={draft.count <= 1}
                                onPress={() => step(-1)}
                            >
                                <HugeiconsIcon color={colors.muted} icon={MinusSignIcon} size={16} strokeWidth={2.2} />
                            </Pressable>
                            <Text className="text-body text-foreground tabular-nums">{`${draft.count} ×`}</Text>
                            <Pressable
                                accessibilityLabel="+"
                                accessibilityRole="button"
                                className="p-2 active:opacity-60"
                                disabled={draft.count >= MAX_INSTALLMENT_COUNT}
                                onPress={() => step(1)}
                            >
                                <HugeiconsIcon color={colors.muted} icon={PlusSignIcon} size={16} strokeWidth={2.2} />
                            </Pressable>
                            <Pressable
                                accessibilityLabel={t("installments.each")}
                                accessibilityRole="button"
                                className="py-1.5 active:opacity-60"
                                onPress={() => openPad("each", each)}
                            >
                                <Text className="text-body text-muted tabular-nums">{money(each)}</Text>
                            </Pressable>
                        </View>

                        <EditorRow
                            label={t("installments.every")}
                            onPress={() => setOpen((shown) => (shown === "every" ? null : "every"))}
                            value={t(`installments.every.${draft.every}`)}
                        />
                        {open === "every" ? (
                            <Animated.View entering={revealEntering()}>
                                {EVERY_ORDER.map((key) => (
                                    <ChoiceRow
                                        detail={key === "weekly" ? undefined : t(`installments.every.${key}.providers`)}
                                        key={key}
                                        label={t(`installments.every.${key}`)}
                                        onPress={() => {
                                            setOpen(null);
                                            onChange(rescheduled(draft, { every: key, firstDue: null }));
                                        }}
                                        selected={draft.every === key}
                                    />
                                ))}
                            </Animated.View>
                        ) : null}

                        <EditorRow
                            label={t("installments.firstDue")}
                            onPress={() => setOpen((shown) => (shown === "firstDue" ? null : "firstDue"))}
                            value={firstDue ? formatTargetDate(firstDue, language) : ""}
                        />
                        {open === "firstDue" && firstDue ? (
                            <Animated.View className="border-border border-b py-2" entering={revealEntering()}>
                                <CompactDatePicker
                                    label={t("installments.firstDue")}
                                    onChange={(next) => {
                                        setOpen(null);
                                        onChange(rescheduled(draft, { firstDue: next }));
                                    }}
                                    onDismiss={() => setOpen(null)}
                                    range={{ start: purchaseDay }}
                                    value={firstDue}
                                />
                            </Animated.View>
                        ) : null}
                    </View>

                    {schedule === null ? (
                        emptyNote !== null && <Text className="text-expense text-subtitle pt-2">{emptyNote}</Text>
                    ) : (
                        <View className="pt-5">
                            {schedule.map((row) => (
                                <ScheduleRow
                                    detail={form.rowDetail(row)}
                                    editing={open === row.sequence}
                                    fee={form.feeLine(row)}
                                    key={row.sequence}
                                    money={money}
                                    onAmount={() =>
                                        row.sequence === 0
                                            ? openPad("upfront", upfront)
                                            : openPad({ sequence: row.sequence }, row.amount)
                                    }
                                    onDate={(next) => form.editDate(row.sequence, next)}
                                    onPress={() =>
                                        row.sequence === 0
                                            ? openPad("upfront", upfront)
                                            : setOpen((shown) => (shown === row.sequence ? null : row.sequence))
                                    }
                                    onStopEditing={() => setOpen(null)}
                                    onToggle={() => form.toggle(row.sequence)}
                                    paid={row.sequence === 0 || row.sequence <= paidBefore}
                                    purchaseDay={purchaseDay}
                                    row={row}
                                />
                            ))}
                            <View className="flex-row items-center gap-3 py-3">
                                <View className="flex-1 gap-0.5">
                                    <Text className="text-body text-foreground font-medium">
                                        {t("installments.total")}
                                    </Text>
                                    {over > 0 ? (
                                        <Text className="text-tint text-subtitle">
                                            {t("installments.overPrice", { amount: money(over) })}
                                        </Text>
                                    ) : null}
                                </View>
                                <Text className="text-body text-foreground font-medium tabular-nums">
                                    {money(total)}
                                </Text>
                            </View>
                        </View>
                    )}
                </BottomSheetScrollView>
            </SheetGestureRoot>
            <InstallmentsPad currency={currency} form={form} />
        </BottomSheetModal>
    );
}

function ShareOption({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`rounded-lg px-2.5 py-1 active:opacity-60 ${selected ? "bg-surface-secondary" : ""}`}
            onPress={onPress}
        >
            <Text className={`text-subtitle tabular-nums ${selected ? "text-foreground" : "text-muted"}`}>{label}</Text>
        </Pressable>
    );
}

interface ScheduleRowProps {
    detail: string | null;
    editing: boolean;
    fee: string | null;
    money: (value: number) => string;
    onAmount: () => void;
    onDate: (next: Date) => void;
    onPress: () => void;
    onStopEditing: () => void;
    onToggle: () => void;
    paid: boolean;
    purchaseDay: Date;
    row: ScheduledInstallment;
}

function ScheduleRow({
    detail,
    editing,
    fee,
    money,
    onAmount,
    onDate,
    onPress,
    onStopEditing,
    onToggle,
    paid,
    purchaseDay,
    row,
}: ScheduleRowProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const isUpfront = row.sequence === 0;
    const date = formatSentenceDate(row.dueDate, language);
    return (
        <View>
            <View className="border-border flex-row items-center gap-3 border-b">
                <CheckCircle checked={paid} disabled={isUpfront} label={date} onPress={onToggle} />
                <Pressable
                    accessibilityRole="button"
                    className="flex-1 flex-row items-center gap-3 py-3 active:opacity-60"
                    onPress={onPress}
                >
                    <View className="flex-1 gap-0.5">
                        <Text className="text-body text-foreground">
                            {isUpfront ? t("installments.upfront") : date}
                        </Text>
                        {detail ? <Text className="text-muted text-subtitle">{detail}</Text> : null}
                    </View>
                    <View className="items-end gap-0.5">
                        <Text className="text-body text-foreground tabular-nums">{money(row.amount)}</Text>
                        {fee ? <Text className="text-muted text-subtitle tabular-nums">{fee}</Text> : null}
                    </View>
                </Pressable>
            </View>
            {editing ? (
                <Animated.View
                    className="border-border flex-row items-center gap-3 border-b py-2"
                    entering={revealEntering()}
                >
                    <View className="flex-1">
                        <CompactDatePicker
                            label={t("installments.cuota.due")}
                            onChange={onDate}
                            onDismiss={onStopEditing}
                            range={{ start: purchaseDay }}
                            value={row.dueDate}
                        />
                    </View>
                    <Pressable
                        accessibilityLabel={t("installments.cuota.amount")}
                        accessibilityRole="button"
                        className="py-1.5 active:opacity-60"
                        onPress={onAmount}
                    >
                        <Text className="text-body text-tint tabular-nums">{money(row.amount)}</Text>
                    </Pressable>
                </Animated.View>
            ) : null}
        </View>
    );
}

const CIRCLE = 22;

function CheckCircle({
    checked,
    disabled,
    label,
    onPress,
}: {
    checked: boolean;
    disabled: boolean;
    label: string;
    onPress: () => void;
}) {
    const colors = useColors();
    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled }}
            className="active:opacity-60"
            disabled={disabled}
            hitSlop={10}
            onPress={onPress}
        >
            <View
                className={`items-center justify-center rounded-full ${checked ? "bg-foreground" : "border-border border-[1.5px]"}`}
                style={{ height: CIRCLE, width: CIRCLE }}
            >
                {checked ? (
                    <HugeiconsIcon color={colors.background} icon={Tick02Icon} size={14} strokeWidth={2.6} />
                ) : null}
            </View>
        </Pressable>
    );
}
