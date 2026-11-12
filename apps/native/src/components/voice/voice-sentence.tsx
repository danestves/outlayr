import { Pressable, View } from "react-native";

import { intervalPhrase } from "@/components/custom-schedule-sheet";
import { useNow } from "@/data/use-now";
import { formatRelativeDay } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import type { SlotFill, VoiceSentence } from "@/domain/voice-sentence";
import { useLanguage, useTranslation } from "@/i18n/context";

import { Sentence, useSentenceStyle } from "../sentence/sentence";
import { Text } from "../text";
import { cn } from "../tw";

// Matches `SentenceValue`'s rule.
const RULE_BOTTOM = 7;

interface PartProps<T> {
    accessibilityLabel: string;
    blank: string;
    /** The date nobody spoke reads as the day it will default to. */
    fallback?: string;
    fill: SlotFill<T> | null;
    onPress: (() => void) | undefined;
    show: (value: T) => string;
    showWas?: (value: T) => string;
}

function Part<T>({ accessibilityLabel, blank, fallback, fill, onPress, show, showWas = show }: PartProps<T>) {
    const t = useTranslation();
    const { textClassName } = useSentenceStyle();
    const text = fill === null ? (fallback ?? blank) : show(fill.value);
    const open = fill === null && fallback === undefined;

    const tone = () => {
        if (open) {
            return "text-tint";
        }
        return fill === null ? "text-muted" : "text-foreground";
    };

    const rule = () => {
        if (open) {
            return "border-tint border-b-2 border-dashed";
        }
        if (fill === null) {
            return "border-grammar border-b-2 border-dotted";
        }
        return fill.mark === "guessed"
            ? "border-grammar border-b-2 border-dashed"
            : "bg-foreground h-[2px] rounded-full";
    };

    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={onPress ? "button" : "text"}
            accessibilityValue={{
                text:
                    fill?.was === null || fill === null
                        ? text
                        : t("voice.turn.corrected", { value: text, was: showWas(fill.was) }),
            }}
            disabled={onPress === undefined}
            onPress={onPress}
        >
            <View className="flex-row items-baseline gap-1.5">
                {fill?.was === null || fill === null ? null : (
                    <Text className={cn(textClassName, "text-muted line-through")}>{showWas(fill.was)}</Text>
                )}
                <Text className={cn(textClassName, tone())}>{text}</Text>
            </View>
            <View
                className={cn("absolute right-0 left-0", rule())}
                pointerEvents="none"
                style={{ bottom: RULE_BOTTOM }}
            />
        </Pressable>
    );
}

interface VoiceSentenceViewProps {
    accountName: (id: string) => string | null;
    categoryName: (id: string) => string | null;
    currency: string;
    /** Set once a draft is resolved: tapping a part opens the editor, as the Edit button does. */
    onEdit?: () => void;
    sentence: VoiceSentence;
}

const name = (lookup: (id: string) => string | null, blank: string) => (id: string) => lookup(id) ?? blank;

export function VoiceSentenceView({ accountName, categoryName, currency, onEdit, sentence }: VoiceSentenceViewProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const now = new Date(useNow());
    const kind = sentence.kind ?? "expense";
    const code = sentence.currency ?? currency;

    const every = ({ coefficient, type }: { coefficient: number; type: number }) =>
        t("transaction.schedule.every", { interval: intervalPhrase(t, type, coefficient) }).toLocaleLowerCase(language);

    const slots = {
        account: (
            <Part
                accessibilityLabel={t("voice.turn.field.account")}
                blank={t("transaction.sentence.blank.account")}
                fill={sentence.account}
                onPress={onEdit}
                show={name(accountName, t("transaction.sentence.blank.account"))}
            />
        ),
        amount: (
            <Part
                accessibilityLabel={t("voice.turn.field.amount")}
                blank={t("transfers.sentence.blank.amount")}
                fill={sentence.amount}
                onPress={onEdit}
                show={(value: number) => formatAmount(value, code, true, language)}
                showWas={(value: number) => formatAmount(value, sentence.wasCurrency ?? code, true, language)}
            />
        ),
        category: (
            <Part
                accessibilityLabel={t("voice.turn.field.category")}
                blank={t("transaction.sentence.blank.category")}
                fill={sentence.category}
                onPress={onEdit}
                show={name(categoryName, t("transaction.sentence.blank.category"))}
            />
        ),
        every: (
            <Part
                accessibilityLabel={t("voice.turn.field.schedule")}
                blank={t("transaction.schedule.everyLabel")}
                fill={sentence.recurrence}
                onPress={onEdit}
                show={every}
            />
        ),
        from: (
            <Part
                accessibilityLabel={t("transfers.field.from")}
                blank={t("transaction.sentence.blank.account")}
                fill={sentence.from}
                onPress={onEdit}
                show={name(accountName, t("transaction.sentence.blank.account"))}
            />
        ),
        merchant: (
            <Part
                accessibilityLabel={t("voice.turn.field.merchant")}
                blank={t("transaction.sentence.blank.merchant")}
                fill={sentence.merchant}
                onPress={onEdit}
                show={(value: string) => value}
            />
        ),
        to: (
            <Part
                accessibilityLabel={t("transfers.field.to")}
                blank={t("transaction.sentence.blank.account")}
                fill={sentence.to}
                onPress={onEdit}
                show={name(accountName, t("transaction.sentence.blank.account"))}
            />
        ),
        when: (
            <Part
                accessibilityLabel={t("voice.turn.field.date")}
                blank={t("voice.turn.field.date")}
                fallback={formatRelativeDay(now, now, language)}
                fill={sentence.date}
                onPress={onEdit}
                show={(value: Date) => formatRelativeDay(value, now, language)}
            />
        ),
    };

    return <Sentence slots={slots} template={t(`voice.sentence.${kind}`)} />;
}
