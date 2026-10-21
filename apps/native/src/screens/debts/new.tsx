import { Host } from "@expo/ui";
import {
    DatePicker,
    Divider,
    HStack,
    Image,
    Picker,
    RNHostView,
    ScrollView,
    Spacer,
    Text as SwiftText,
    TextField,
    useNativeState,
    VStack,
    ZStack,
} from "@expo/ui/swift-ui";
import {
    accessibilityAddTraits,
    accessibilityElement,
    accessibilityHidden,
    accessibilityLabel,
    accessibilityValue,
    datePickerStyle,
    font,
    foregroundStyle,
    labelsHidden,
    lineLimit,
    multilineTextAlignment,
    onTapGesture,
    opacity,
    overlay,
    padding,
    pickerStyle,
    scrollDismissesKeyboard,
    submitLabel,
    tag,
    textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import { Stack } from "expo-router";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { use } from "react";
import { Pressable, View } from "react-native";

import { AccountTile } from "@/components/account-tile";
import { HeroNumber } from "@/components/amount-text";
import { InlineFailure } from "@/components/form/inline-failure";
import { toolbarIcon } from "@/components/toolbar-icons";
import { BODY, ROW, rowLabel } from "@/components/transaction-form/style";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import type { Account } from "@/data/accounts-core";
import { tomorrowLocal } from "@/domain/local-day";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { hitArea, outline } from "@/lib/swift-ui-geometry";
import { useDatePickerLocale } from "@/screens/budgets/components/compact-date-picker";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { NewDebtSheets, present, useNewDebtForm } from "./new-debt-form";
import type { NewDebtProps } from "./new-debt-form";

const CHEVRON = font({ design: "rounded", textStyle: "footnote", weight: "semibold" });
const SUGGESTION_TILE = 22;
const PLACEHOLDER = { style: "tertiary", type: "hierarchical" } as const;
const SEGMENT_HEIGHT = 32;
const FIADO = "fiado";

export function NewDebt(props: NewDebtProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const { showCents } = useDisplaySettings().state;
    const headerHeight = use(HeaderHeightContext) ?? 0;
    const form = useNewDebtForm(props);
    const { choice, currency, soldOnCredit, theirCurrency } = form;
    const nameState = useNativeState("");
    const noteState = useNativeState("");
    const dateLocale = useDatePickerLocale();

    const hairline = [overlay({ color: withAlpha(colors.foreground, 0.08) })];

    return (
        <View style={{ backgroundColor: colors.groupedBackground, flex: 1 }}>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Button
                    accessibilityLabel={t("common.save")}
                    disabled={!form.canSave}
                    onPress={form.onSave}
                >
                    <Stack.Toolbar.Icon {...toolbarIcon("done")} />
                </Stack.Toolbar.Button>
            </Stack.Toolbar>

            <View className="items-center gap-4 px-5 pb-2" style={{ paddingTop: headerHeight + 8 }}>
                <Host style={{ alignSelf: "stretch", height: SEGMENT_HEIGHT }}>
                    <Picker
                        label=""
                        modifiers={[pickerStyle("segmented")]}
                        onSelectionChange={(value) => {
                            const picked = form.choices.find((option) => option.verb === value);
                            form.setSoldOnCredit(value === FIADO);
                            if (picked) {
                                form.setVerb(picked.verb);
                            }
                        }}
                        selection={soldOnCredit ? FIADO : choice.verb}
                    >
                        {form.choices.map((option) => (
                            <SwiftText key={option.verb} modifiers={[tag(option.verb)]}>
                                {t(option.labelKey)}
                            </SwiftText>
                        ))}
                        <SwiftText modifiers={[tag(FIADO)]}>{t("debts.verb.soldOnCredit")}</SwiftText>
                    </Picker>
                </Host>
                <Pressable
                    accessibilityLabel={t("debts.a11y.amount")}
                    accessibilityRole="button"
                    className="active:opacity-70"
                    onPress={() => present(form.amountSheet)}
                >
                    <HeroNumber amount={form.amount} code={currency} showCents={showCents} sign="" still />
                </Pressable>
            </View>

            <Host style={{ flex: 1 }}>
                <ScrollView modifiers={[scrollDismissesKeyboard("immediately")]}>
                    <VStack modifiers={[padding({ horizontal: 20, top: 8 })]} spacing={0}>
                        <Divider modifiers={hairline} />
                        <PersonField
                            label={form.personLabel}
                            lockedName={form.lockedPerson?.name ?? null}
                            nameState={nameState}
                            onName={form.setName}
                        />
                        {form.suggestions.map((row) => (
                            <PersonSuggestion
                                key={row.id}
                                onPick={() => {
                                    nameState.set(row.name);
                                    form.setName(row.name);
                                }}
                                person={row}
                            />
                        ))}
                        <Divider modifiers={hairline} />
                        {soldOnCredit ? (
                            <PickerField
                                chevron
                                label={t("transaction.field.category")}
                                onPress={() => present(form.categorySheet)}
                                value={form.category?.name ?? ""}
                            />
                        ) : (
                            <PickerField
                                chevron
                                label={form.accountLabel}
                                onPress={() => present(form.accountSheet)}
                                value={form.accountValue}
                            />
                        )}
                        {theirCurrency === null ? null : (
                            <>
                                <Divider modifiers={hairline} />
                                <PickerField
                                    label={t("debts.field.theirSide", { currency: theirCurrency })}
                                    onPress={() => present(form.theirSheet)}
                                    value={formatAmount(form.theirAmount, theirCurrency, true, language)}
                                />
                            </>
                        )}
                        {form.pickCurrency ? (
                            <>
                                <Divider modifiers={hairline} />
                                <PickerField
                                    chevron
                                    label={t("debts.field.currency")}
                                    onPress={() => present(form.currencySheet)}
                                    value={currency}
                                />
                            </>
                        ) : null}
                        {form.before ? null : (
                            <>
                                <Divider modifiers={hairline} />
                                <HStack modifiers={ROW}>
                                    <SwiftText modifiers={[BODY, rowLabel]}>{t("debts.field.date")}</SwiftText>
                                    <Spacer />
                                    <DatePicker
                                        displayedComponents={["date"]}
                                        modifiers={[datePickerStyle("compact"), labelsHidden(), dateLocale]}
                                        onDateChange={form.setDate}
                                        range={{ end: new Date(form.nowMs) }}
                                        selection={form.date}
                                    />
                                </HStack>
                            </>
                        )}
                        <Divider modifiers={hairline} />
                        <PayBackByField form={form} />
                        {form.before ? null : (
                            <>
                                <Divider modifiers={hairline} />
                                <HStack modifiers={ROW}>
                                    <SwiftText modifiers={[BODY, rowLabel]}>{t("debts.field.note")}</SwiftText>
                                    <Spacer />
                                    <TextField
                                        modifiers={[
                                            BODY,
                                            foregroundStyle(colors.foreground),
                                            multilineTextAlignment("trailing"),
                                            submitLabel("done"),
                                        ]}
                                        onTextChange={form.setNote}
                                        placeholder={t("debts.field.notePlaceholder")}
                                        text={noteState}
                                    />
                                </HStack>
                            </>
                        )}
                        <Divider modifiers={hairline} />
                    </VStack>
                </ScrollView>
            </Host>

            <View className="px-5 pb-8">
                <InlineFailure message={form.failure} />
            </View>

            <NewDebtSheets form={form} />
        </View>
    );
}

/** Stays mounted while empty: one added later reads "19/11/26". */
function PayBackByField({ form }: { form: ReturnType<typeof useNewDebtForm> }) {
    const t = useTranslation();
    const colors = useColors();
    const dateLocale = useDatePickerLocale();
    const label = t("debts.plan.payBackBy");
    const placeholder = t("debts.field.notePlaceholder");
    const empty = form.payBackBy === null;
    return (
        <HStack
            modifiers={[
                ...ROW,
                hitArea(outline.rectangle()),
                onTapGesture(() => {
                    if (empty) {
                        form.openPayBackBy();
                    }
                }),
            ]}
            spacing={10}
        >
            <SwiftText modifiers={[BODY, rowLabel, accessibilityHidden(empty)]}>{label}</SwiftText>
            <Spacer />
            <ZStack alignment="trailing">
                <DatePicker
                    displayedComponents={["date"]}
                    modifiers={[
                        datePickerStyle("compact"),
                        labelsHidden(),
                        dateLocale,
                        opacity(empty ? 0 : 1),
                        accessibilityHidden(empty),
                    ]}
                    onDateChange={form.setPayBackBy}
                    range={{ start: tomorrowLocal(form.nowMs) }}
                    selection={form.payBackBy ?? tomorrowLocal(form.nowMs)}
                />
                <SwiftText
                    modifiers={[
                        BODY,
                        lineLimit(1),
                        foregroundStyle(PLACEHOLDER),
                        opacity(empty ? 1 : 0),
                        onTapGesture(form.openPayBackBy),
                        accessibilityHidden(!empty),
                        accessibilityAddTraits(["isButton"]),
                        accessibilityLabel(label),
                        accessibilityValue(placeholder),
                    ]}
                >
                    {placeholder}
                </SwiftText>
            </ZStack>
            {empty ? null : (
                <Image
                    color={colors.muted}
                    modifiers={[
                        hitArea(outline.rectangle()),
                        onTapGesture(() => form.setPayBackBy(null)),
                        accessibilityLabel(t("debts.plan.remove")),
                        accessibilityAddTraits(["isButton"]),
                    ]}
                    systemName="xmark.circle.fill"
                />
            )}
        </HStack>
    );
}

function PersonSuggestion({ onPick, person }: { onPick: () => void; person: Account }) {
    const colors = useColors();
    return (
        <HStack
            modifiers={[
                ...ROW,
                hitArea(outline.rectangle()),
                onTapGesture(onPick),
                accessibilityElement("combine"),
                accessibilityAddTraits(["isButton"]),
                accessibilityLabel(person.name),
            ]}
            spacing={10}
        >
            <Spacer />
            <SwiftText modifiers={[BODY, lineLimit(1), foregroundStyle(colors.tint)]}>{person.name}</SwiftText>
            <RNHostView matchContents>
                <View style={{ height: SUGGESTION_TILE, width: SUGGESTION_TILE }}>
                    <AccountTile account={person} radius={6} size={SUGGESTION_TILE} />
                </View>
            </RNHostView>
        </HStack>
    );
}

interface PickerFieldProps {
    chevron?: boolean;
    label: string;
    onPress: () => void;
    value: string;
}

function PickerField({ chevron = false, label, onPress, value }: PickerFieldProps) {
    const colors = useColors();
    return (
        <HStack
            modifiers={[
                ...ROW,
                hitArea(outline.rectangle()),
                onTapGesture(onPress),
                accessibilityElement("combine"),
                accessibilityAddTraits(["isButton"]),
                accessibilityLabel(label),
                accessibilityValue(value),
            ]}
        >
            <SwiftText modifiers={[BODY, rowLabel]}>{label}</SwiftText>
            <Spacer />
            <SwiftText modifiers={[BODY, lineLimit(1), foregroundStyle(colors.foreground)]}>{value}</SwiftText>
            {chevron ? <Image color={colors.muted} modifiers={[CHEVRON]} systemName="chevron.up.chevron.down" /> : null}
        </HStack>
    );
}

interface PersonFieldProps {
    label: string;
    lockedName: string | null;
    nameState: ReturnType<typeof useNativeState<string>>;
    onName: (name: string) => void;
}

function PersonField({ label, lockedName, nameState, onName }: PersonFieldProps) {
    const t = useTranslation();
    const colors = useColors();
    return (
        <HStack modifiers={ROW}>
            <SwiftText modifiers={[BODY, rowLabel]}>{label}</SwiftText>
            <Spacer />
            {lockedName === null ? (
                <TextField
                    modifiers={[
                        BODY,
                        foregroundStyle(colors.foreground),
                        multilineTextAlignment("trailing"),
                        textInputAutocapitalization("words"),
                        submitLabel("done"),
                    ]}
                    onTextChange={onName}
                    placeholder={t("debts.field.personPlaceholder")}
                    text={nameState}
                />
            ) : (
                <SwiftText modifiers={[BODY, foregroundStyle(colors.foreground)]}>{lockedName}</SwiftText>
            )}
        </HStack>
    );
}
