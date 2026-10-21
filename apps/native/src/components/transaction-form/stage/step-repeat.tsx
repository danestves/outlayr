import { SELECTABLE_RECURRING_TYPES } from "@outlayr/money/recurrence";
import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { formatSentenceDate } from "@/domain/dates";
import { cadenceLabel, leadLabel } from "@/domain/transaction-form-labels";
import { useLanguage, useTranslation } from "@/i18n/context";

import { StageOptionRow } from "./stage-options";
import type { StageOptionItem } from "./stage-options";

// 20/32 has no token pair: `text-title` is 20/26.
const LINE = "font-sans-medium text-[20px] leading-[32px]";

// This face and the sentence's 26/38 both leave 12pt of leading, so the sentence's measured offset clears descenders.
const RULE_BOTTOM = 7;

// Leaves out the three days `REMINDER_LEAD_OPTIONS` carries; a lead outside the list is appended, so a subscription
// restored from another device never renders with nothing selected.
const LEAD_OPTIONS: readonly (number | null)[] = [null, 0, 1, 2, 7];

const CUSTOM_OPTION = "custom";

const LEAD_OFF_OPTION = "off";

const leadOptionId = (lead: number | null): string => (lead === null ? LEAD_OFF_OPTION : String(lead));

interface ScheduleValueProps {
    onPress: () => void;
    value: string;
}

// Not `SentenceValue`: that reads its face from `useSentenceStyle` and renders only inside a `<Sentence>`.
function ScheduleValue({ onPress, value }: ScheduleValueProps) {
    return (
        <Pressable accessibilityLabel={value} accessibilityRole="button" onPress={onPress}>
            <Text className={`${LINE} text-foreground`}>{value}</Text>
            <View
                className="bg-tint absolute right-0 left-0 h-[2px] rounded-full"
                pointerEvents="none"
                style={{ bottom: RULE_BOTTOM }}
            />
        </Pressable>
    );
}

interface StepRepeatProps {
    cadence: number;
    custom?: boolean;
    customLabel?: string;
    endDate: Date | null;
    labels: { ending: string; endingOpen: string; openEnd: string; starting: string };
    /** Days ahead of a charge; null is off. */
    leadDays: number | null;
    onCadenceChange: (type: number) => void;
    onCustomPress: () => void;
    onEndDatePress: () => void;
    onLeadChange: (lead: number | null) => void;
    onStartDatePress: () => void;
    startDate: Date;
}

export function StepRepeat({
    cadence,
    custom = false,
    customLabel,
    endDate,
    labels,
    leadDays,
    onCadenceChange,
    onCustomPress,
    onEndDatePress,
    onLeadChange,
    onStartDatePress,
    startDate,
}: StepRepeatProps) {
    const t = useTranslation();
    const { language } = useLanguage();

    const cadences: StageOptionItem<string>[] = SELECTABLE_RECURRING_TYPES.map((type) => ({
        id: String(type),
        label: cadenceLabel(t, type),
    }));
    cadences.push({ id: CUSTOM_OPTION, label: customLabel ?? t("transaction.schedule.customOption") });

    const pickCadence = (id: string) => {
        if (id === CUSTOM_OPTION) {
            onCustomPress();
            return;
        }
        onCadenceChange(Number(id));
    };

    const leads = LEAD_OPTIONS.includes(leadDays) ? LEAD_OPTIONS : [...LEAD_OPTIONS, leadDays];
    const leadOptions: StageOptionItem<string>[] = leads.map((lead) => ({
        id: leadOptionId(lead),
        label: leadLabel(t, lead),
    }));

    const pickLead = (id: string) => {
        onLeadChange(id === LEAD_OFF_OPTION ? null : Number(id));
    };

    return (
        <View className="gap-4">
            <StageOptionRow
                onSelect={pickCadence}
                options={cadences}
                selectedId={custom ? CUSTOM_OPTION : String(cadence)}
            />

            {/* The comma and full stop are punctuation, not copy: both shipped languages place them the same way. */}
            <View className="flex-row flex-wrap items-baseline" testID="stage-repeat-line">
                <Text className={`${LINE} text-grammar`}>{`${labels.starting} `}</Text>
                <ScheduleValue onPress={onStartDatePress} value={formatSentenceDate(startDate, language)} />
                <Text className={`${LINE} text-grammar`}>
                    {`, ${endDate === null ? labels.endingOpen : labels.ending} `}
                </Text>
                <ScheduleValue
                    onPress={onEndDatePress}
                    value={endDate === null ? labels.openEnd : formatSentenceDate(endDate, language)}
                />
                <Text className={`${LINE} text-grammar`}>.</Text>
            </View>

            <View className="gap-2.5">
                <Text className="text-footnote text-muted">{t("transaction.field.remind")}</Text>
                <StageOptionRow onSelect={pickLead} options={leadOptions} selectedId={leadOptionId(leadDays)} />
            </View>
        </View>
    );
}
