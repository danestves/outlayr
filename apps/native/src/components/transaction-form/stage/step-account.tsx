import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { AccountTile } from "@/components/account-tile";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import type { Account } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useTranslation } from "@/i18n/context";

import { StageOptionRow } from "./stage-options";
import type { StageOptionItem } from "./stage-options";

// See `step-category.tsx` for why the step scrolls rather than grows.
const MAX_LIST_HEIGHT = 176;

const TILE = 22;

// No account id can collide: they are uuids.
const NONE_OPTION = "__none__";
const NO_PEOPLE: readonly Account[] = [];

interface StepAccountProps {
    accounts: readonly Account[];
    after?: ReactNode;
    allowNone?: boolean;
    onSelect: (account: Account | null) => void;
    people?: readonly Account[];
    selectedId: string | null;
}

// No create prop on purpose: with no bank to pick, the host points the stage's footer at its account editor.
export function StepAccount({
    accounts,
    after,
    allowNone = true,
    onSelect,
    people = NO_PEOPLE,
    selectedId,
}: StepAccountProps) {
    const t = useTranslation();
    const largeText = useAccessibilityTextSize();
    const ledgerCurrency = useGlobalCurrency(useDatabase());

    if (accounts.length === 0 && people.length === 0) {
        return (
            <>
                <Text className="text-muted text-subtitle" testID="stage-account-empty">
                    {t("transaction.account.empty")}
                </Text>
                {after}
            </>
        );
    }

    const optionFor = (account: Account): StageOptionItem<string> => {
        const foreign = account.currency !== ledgerCurrency;
        return {
            accessibilityLabel: foreign ? `${account.name}, ${account.currency}` : undefined,
            id: account.id,
            label: account.name,
            leading: <AccountTile account={account} radius={6} size={TILE} />,
            trailing: foreign ? <Text className="text-label text-tint font-mono">{account.currency}</Text> : undefined,
        };
    };
    const options = accounts.map(optionFor);
    if (allowNone) {
        options.unshift({ id: NONE_OPTION, label: t("transaction.account.none") });
    }

    const pick = (id: string) => {
        onSelect([...accounts, ...people].find((account) => account.id === id) ?? null);
    };

    return (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!largeText}
            showsVerticalScrollIndicator={false}
            style={largeText ? undefined : { maxHeight: MAX_LIST_HEIGHT }}
            testID="stage-accounts"
        >
            {options.length > 0 ? (
                <StageOptionRow onSelect={pick} options={options} selectedId={selectedId ?? NONE_OPTION} />
            ) : null}
            {people.length > 0 ? (
                <View className="gap-2 pt-4">
                    <MonoLabel>{t("debts.people")}</MonoLabel>
                    <StageOptionRow onSelect={pick} options={people.map(optionFor)} selectedId={selectedId} />
                </View>
            ) : null}
            {after}
        </ScrollView>
    );
}
