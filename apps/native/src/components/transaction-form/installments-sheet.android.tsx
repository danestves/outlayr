import { BottomSheetModal, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import {
    Checkbox,
    SegmentedButton,
    SingleChoiceSegmentedButtonRow,
    Text as ComposeText,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import MinusSignIcon from "@hugeicons-pro/core-stroke-rounded/MinusSignIcon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChoiceRow } from "@/components/list/list-row";
import { ListItemText } from "@/components/list/material-list-item";
import { MaterialHost } from "@/components/material-host";
import { OutlinedDateField } from "@/components/material/outlined-date-field";
import { OutlinedDropdownField } from "@/components/material/outlined-dropdown-field";
import { OutlinedSelectField } from "@/components/material/outlined-field";
import { formatSentenceDate } from "@/domain/dates";
import { EVERY_ORDER, MAX_INSTALLMENT_COUNT, rescheduled } from "@/domain/installment-draft";
import type { ScheduledInstallment } from "@/domain/installments";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useLanguage, useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import { SheetGestureRoot } from "../sheet-gesture-root";
import { Text } from "../text";
import { InstallmentsPad, NONE, useInstallmentsSheetForm } from "./installments-sheet-form";
import type { InstallmentsSheetProps } from "./installments-sheet-form";

const PRESSED_ALPHA = 0.1;
const STATE_LAYER_RADIUS = 20;
const LABEL_FONT = { fontFamily: "GoogleSansFlex_500Medium" } as const;
// Taller than most screens, so it opens expanded and scrolls: a fitted sheet here cannot.
const SNAP_POINTS = ["100%"];

function fieldValue(value: string) {
    return (
        <Text className="text-body text-m3-on-surface tabular-nums" numberOfLines={1}>
            {value}
        </Text>
    );
}

export function InstallmentsSheet(props: InstallmentsSheetProps) {
    const { accounts, currency, draft, onChange, purchaseDay, ref, schedule } = props;
    const t = useTranslation();
    const insets = useSafeAreaInsets();
    const sheetSurface = useSheetSurface();
    const form = useInstallmentsSheetForm(props);
    const { each, emptyNote, firstDue, from, money, open, openPad, over, paidBefore, setOpen, step, total, upfront } =
        form;
    const noneLabel = `${t("installments.from.none")} · ${t("installments.notFromAccount")}`;

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing={false}
            enablePanDownToClose
            ref={ref}
            snapPoints={SNAP_POINTS}
        >
            <SheetGestureRoot fill>
                <BottomSheetScrollView
                    contentContainerStyle={{ paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="gap-1 px-2 pb-4">
                        <Text accessibilityRole="header" className="text-m3-on-surface text-[22px] leading-7">
                            {t("installments.chip")}
                        </Text>
                        <Text className="text-body text-m3-on-surface-variant">{form.summary}</Text>
                    </View>
                    <View className="gap-4">
                        <OutlinedSelectField
                            accessibilityValue={money(upfront)}
                            dropdown={false}
                            ground={sheetSurface}
                            label={t("installments.paidNow")}
                            onPress={() => openPad("upfront", upfront)}
                            value={fieldValue(money(upfront))}
                        />
                        <MaterialHost matchContents={{ vertical: true }}>
                            <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
                                {form.shares.map((share) => (
                                    <SegmentedButton
                                        key={share.label}
                                        onClick={share.onPress}
                                        selected={share.selected}
                                    >
                                        <SegmentedButton.Label>
                                            <ComposeText maxLines={1} style={LABEL_FONT}>
                                                {share.label}
                                            </ComposeText>
                                        </SegmentedButton.Label>
                                    </SegmentedButton>
                                ))}
                            </SingleChoiceSegmentedButtonRow>
                        </MaterialHost>

                        {upfront > 0 ? (
                            <OutlinedDropdownField
                                ground={sheetSurface}
                                label={t("installments.from")}
                                onChange={(id) => onChange({ ...draft, upfrontAccountId: id === NONE ? null : id })}
                                options={[
                                    { label: noneLabel, value: NONE },
                                    ...accounts.map((account) => ({ label: account.name, value: account.id })),
                                ]}
                                value={from?.id ?? NONE}
                            />
                        ) : null}

                        <OutlinedSelectField
                            accessibilityValue={`${draft.count} × ${money(each)}`}
                            dropdown={false}
                            ground={sheetSurface}
                            label={t("installments.then")}
                            leading={
                                <View className="flex-row items-center pr-2">
                                    <StepButton
                                        disabled={draft.count <= 1}
                                        icon={MinusSignIcon}
                                        label="−"
                                        onPress={() => step(-1)}
                                    />
                                    <Text className="text-body text-m3-on-surface tabular-nums">{`${draft.count} ×`}</Text>
                                    <StepButton
                                        disabled={draft.count >= MAX_INSTALLMENT_COUNT}
                                        icon={PlusSignIcon}
                                        label="+"
                                        onPress={() => step(1)}
                                    />
                                </View>
                            }
                            onPress={() => openPad("each", each)}
                            value={fieldValue(money(each))}
                        />

                        <View>
                            <OutlinedSelectField
                                accessibilityValue={t(`installments.every.${draft.every}`)}
                                focused={open === "every"}
                                ground={sheetSurface}
                                label={t("installments.every")}
                                onPress={() => setOpen((shown) => (shown === "every" ? null : "every"))}
                                value={fieldValue(t(`installments.every.${draft.every}`))}
                            />
                            {open === "every"
                                ? EVERY_ORDER.map((key) => (
                                      <ChoiceRow
                                          detail={
                                              key === "weekly" ? undefined : t(`installments.every.${key}.providers`)
                                          }
                                          key={key}
                                          label={t(`installments.every.${key}`)}
                                          onPress={() => {
                                              setOpen(null);
                                              onChange(rescheduled(draft, { every: key, firstDue: null }));
                                          }}
                                          selected={draft.every === key}
                                      />
                                  ))
                                : null}
                        </View>

                        {firstDue ? (
                            <OutlinedDateField
                                ground={sheetSurface}
                                label={t("installments.firstDue")}
                                onChange={(next) => onChange(rescheduled(draft, { firstDue: next }))}
                                range={{ start: purchaseDay }}
                                value={firstDue}
                            />
                        ) : (
                            <OutlinedSelectField
                                accessibilityValue=""
                                dropdown={false}
                                ground={sheetSurface}
                                label={t("installments.firstDue")}
                                value={null}
                            />
                        )}
                    </View>

                    {schedule === null ? (
                        emptyNote !== null && <Text className="text-caption text-m3-error px-4 pt-2">{emptyNote}</Text>
                    ) : (
                        <View className="pt-4">
                            {schedule.map((row) => (
                                <ScheduleRow
                                    detail={form.rowDetail(row)}
                                    editing={open === row.sequence}
                                    fee={form.feeLine(row)}
                                    key={row.sequence}
                                    money={money}
                                    onAmount={() => openPad({ sequence: row.sequence }, row.amount)}
                                    onClose={() => setOpen(null)}
                                    onDate={(next) => form.editDate(row.sequence, next)}
                                    onPress={() =>
                                        row.sequence === 0
                                            ? openPad("upfront", upfront)
                                            : setOpen((shown) => (shown === row.sequence ? null : row.sequence))
                                    }
                                    onToggle={() => form.toggle(row.sequence)}
                                    paid={row.sequence === 0 || row.sequence <= paidBefore}
                                    purchaseDay={purchaseDay}
                                    row={row}
                                />
                            ))}
                            <View className="min-h-18 flex-row items-center gap-4 py-2 pl-12">
                                <View className="flex-1 pl-2">
                                    <Text className="font-sans-medium text-body text-m3-on-surface">
                                        {t("installments.total")}
                                    </Text>
                                    {over > 0 ? (
                                        <Text className="text-caption text-m3-primary">
                                            {t("installments.overPrice", { amount: money(over) })}
                                        </Text>
                                    ) : null}
                                </View>
                                <Text className="font-sans-medium text-body text-m3-on-surface tabular-nums">
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

function StepButton({
    disabled,
    icon,
    label,
    onPress,
}: {
    disabled: boolean;
    icon: IconSvgElement;
    label: string;
    onPress: () => void;
}) {
    const m3 = useMaterialColors();
    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            android_ripple={{
                borderless: true,
                color: withAlpha(m3.onSurface, PRESSED_ALPHA),
                radius: STATE_LAYER_RADIUS,
            }}
            className="size-12 items-center justify-center"
            disabled={disabled}
            onPress={onPress}
            style={{ opacity: disabled ? 0.38 : 1 }}
        >
            <HugeiconsIcon color={m3.onSurfaceVariant} icon={icon} size={20} />
        </Pressable>
    );
}

interface ScheduleRowProps {
    detail: string | null;
    editing: boolean;
    fee: string | null;
    money: (value: number) => string;
    onAmount: () => void;
    onClose: () => void;
    onDate: (next: Date) => void;
    onPress: () => void;
    onToggle: () => void;
    paid: boolean;
    purchaseDay: Date;
    row: ScheduledInstallment;
}

// The checkbox is drawn by Compose but pressed through RN, so a tap on it never reaches the row.
function ScheduleRow({
    detail,
    editing,
    fee,
    money,
    onAmount,
    onClose,
    onDate,
    onPress,
    onToggle,
    paid,
    purchaseDay,
    row,
}: ScheduleRowProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const m3 = useMaterialColors();
    const sheetSurface = useSheetSurface();
    const isUpfront = row.sequence === 0;
    const date = formatSentenceDate(row.dueDate, language);
    const amount = money(row.amount);
    return (
        <View className="border-m3-outline-variant border-b">
            <View className="min-h-18 flex-row items-center">
                <Pressable
                    accessibilityLabel={date}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: paid, disabled: isUpfront }}
                    android_ripple={{
                        borderless: true,
                        color: withAlpha(m3.onSurface, PRESSED_ALPHA),
                        radius: STATE_LAYER_RADIUS,
                    }}
                    className="size-12 items-center justify-center"
                    disabled={isUpfront}
                    onPress={onToggle}
                >
                    <View importantForAccessibility="no-hide-descendants" pointerEvents="none">
                        <MaterialHost matchContents>
                            <Checkbox value={paid} />
                        </MaterialHost>
                    </View>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={isUpfront ? undefined : { expanded: editing }}
                    android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
                    className="flex-1 flex-row items-center gap-4 self-stretch py-2 pl-2"
                    onPress={onPress}
                >
                    <View className="flex-1">
                        <ListItemText supporting={[detail]} title={isUpfront ? t("installments.upfront") : date} />
                    </View>
                    <View className="items-end">
                        <Text className="text-body text-m3-on-surface tabular-nums">{amount}</Text>
                        {fee ? (
                            <Text className="text-caption text-m3-on-surface-variant tabular-nums">{fee}</Text>
                        ) : null}
                    </View>
                </Pressable>
            </View>
            {editing ? (
                <View className="flex-row gap-3 pb-4 pl-14">
                    <View className="flex-1">
                        <OutlinedDateField
                            ground={sheetSurface}
                            label={t("installments.cuota.due")}
                            onChange={onDate}
                            onDismiss={onClose}
                            range={{ start: purchaseDay }}
                            value={row.dueDate}
                        />
                    </View>
                    <View className="flex-1">
                        <OutlinedSelectField
                            accessibilityValue={amount}
                            dropdown={false}
                            ground={sheetSurface}
                            label={t("installments.cuota.amount")}
                            onPress={onAmount}
                            value={fieldValue(amount)}
                        />
                    </View>
                </View>
            ) : null}
        </View>
    );
}
