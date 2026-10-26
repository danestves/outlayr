import ArrowDown01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Sentence } from "@/components/sentence/sentence";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useColors } from "@/theme/use-colors";

import { StageOptionRow } from "./stage-options";
import type { StageOptionItem } from "./stage-options";

const CELL_LABEL = "text-eyebrow text-muted tracking-eyebrow font-mono uppercase";
const CELL_VALUE = "font-mono-medium text-callout text-foreground";
const CHEVRON = 12;

export interface StepFeeField {
    comesTo: { amount: string; template: string } | null;
    label: string;
    placeholder: boolean;
    unit: string;
    value: string;
}

export interface StepFeeSide {
    amount: string;
    label: string;
    onPress: () => void;
    selected: boolean;
}

interface LoggedAs {
    labels: { loggedAs: string; total: string };
    loggedAs: string;
    onLoggedAsPress: () => void;
    sides?: never;
    total: string | null;
}

/** A fee per account instead of one fee and where it is logged: each cell picks the fee the pad edits. */
interface PerSide {
    labels?: never;
    loggedAs?: never;
    onLoggedAsPress?: never;
    sides: readonly StepFeeSide[];
    total?: never;
}

type StepFeeProps<Id extends string> = {
    children?: ReactNode;
    field: StepFeeField | null;
    onSelect: (id: Id) => void;
    options: readonly StageOptionItem<Id>[];
    selectedId: Id;
} & (LoggedAs | PerSide);

function FeeField({ comesTo, label, placeholder, unit, value }: StepFeeField) {
    const largeText = useAccessibilityTextSize();
    return (
        <View
            accessibilityLabel={label}
            accessibilityLiveRegion="polite"
            accessibilityValue={{
                text: [`${value} ${unit}`, comesTo?.template.replace("{amount}", comesTo.amount)]
                    .filter((part) => part !== undefined)
                    .join(", "),
            }}
            accessible
            className={cn("border-tint flex-row items-baseline gap-2.5 border-b-2", largeText ? "min-h-12" : "h-12")}
            testID="stage-fee-field"
        >
            <View className="flex-row items-center">
                <Text
                    className={cn(
                        "font-mono-medium text-[32px] leading-[44px] tracking-tight tabular-nums",
                        placeholder ? "text-muted" : "text-foreground"
                    )}
                >
                    {value}
                </Text>
                <View className="bg-tint ml-0.5 h-7 w-[2.5px] rounded-full" />
            </View>
            <Text className="font-sans-medium text-callout text-foreground">{unit}</Text>
            {comesTo === null ? null : (
                <View className="ml-auto">
                    <Sentence
                        gapClassName="gap-x-1"
                        slots={{
                            amount: (
                                <Text className="font-sans-semibold text-callout text-foreground tabular-nums">
                                    {comesTo.amount}
                                </Text>
                            ),
                        }}
                        template={comesTo.template}
                        textClassName="text-subtitle text-muted"
                    />
                </View>
            )}
        </View>
    );
}

function FeeSides({ sides }: { sides: readonly StepFeeSide[] }) {
    return (
        <View className="border-border flex-row border-t">
            {sides.map(({ amount, label, onPress, selected }, index) => (
                <Pressable
                    accessibilityLabel={`${label}, ${amount}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={cn(
                        "min-w-0 flex-1 items-start pt-2.5 active:opacity-60",
                        index > 0 && "border-border border-l pl-3.5"
                    )}
                    key={label}
                    onPress={onPress}
                    style={{ minHeight: 44 }}
                >
                    <Text className={CELL_LABEL} numberOfLines={1}>
                        {label}
                    </Text>
                    <Text
                        className={cn(
                            CELL_VALUE,
                            "tabular-nums",
                            selected ? "border-tint text-tint border-b-[1.5px]" : "border-b-[1.5px] border-transparent"
                        )}
                    >
                        {amount}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
}

function LoggedAsRow({ labels, loggedAs, onLoggedAsPress, total }: LoggedAs) {
    const colors = useColors();
    return (
        <View className="border-border flex-row border-t">
            <Pressable
                accessibilityLabel={`${labels.loggedAs}, ${loggedAs}`}
                accessibilityRole="button"
                className="min-w-0 flex-1 items-start pt-2.5 active:opacity-60"
                onPress={onLoggedAsPress}
                style={{ minHeight: 44 }}
            >
                <Text className={CELL_LABEL}>{labels.loggedAs}</Text>
                <View className="border-tint max-w-full flex-row items-center gap-1 border-b-[1.5px]">
                    <Text className={cn(CELL_VALUE, "shrink")} numberOfLines={1}>
                        {loggedAs}
                    </Text>
                    <HugeiconsIcon color={colors.tint} icon={ArrowDown01Icon} size={CHEVRON} />
                </View>
            </Pressable>
            {total === null ? null : (
                <View className="border-border min-w-0 flex-1 border-l pt-2.5 pl-3.5" style={{ minHeight: 44 }}>
                    <Text className={CELL_LABEL} numberOfLines={1}>
                        {labels.total}
                    </Text>
                    <Text className={cn(CELL_VALUE, "tabular-nums")}>{total}</Text>
                </View>
            )}
        </View>
    );
}

export function StepFee<Id extends string>(props: StepFeeProps<Id>) {
    const { children, field, onSelect, options, selectedId } = props;
    return (
        <View className="gap-3">
            <StageOptionRow onSelect={onSelect} options={options} selectedId={selectedId} />
            {field === null ? null : <FeeField {...field} />}
            {children}
            {props.sides === undefined ? <LoggedAsRow {...props} /> : <FeeSides sides={props.sides} />}
        </View>
    );
}
