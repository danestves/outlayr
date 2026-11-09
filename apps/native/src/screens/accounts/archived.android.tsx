import { Pressable, ScrollView, View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useAccountBalance } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import { useNow } from "@/data/use-now";
import type { Database } from "@/db/client";
import { formatSignedAmount } from "@/domain/account-display";
import { formatSentenceDate } from "@/domain/dates";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

import { useArchivedRows } from "./use-archived-rows";

const ARCHIVED_TILE_OPACITY = 0.55;
const RESTORE_HIT_SLOP = 12;

export function ArchivedAccounts() {
    const t = useTranslation();
    const colors = useColors();
    const { db, restore, rows } = useArchivedRows();

    return (
        <ScrollView className="bg-m3-surface flex-1">
            <View className="px-4 pt-2 pb-2">
                <Eyebrow colors={colors}>{t("accounts.census", { count: rows.length })}</Eyebrow>
            </View>
            {rows.map((account) => (
                <ArchivedRow account={account} db={db} key={account.id} onRestore={restore} />
            ))}
        </ScrollView>
    );
}

function ArchivedRow({
    account,
    db,
    onRestore,
}: {
    account: Account;
    db: Database;
    onRestore: (account: Account) => void;
}) {
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const balance = useAccountBalance(db, account, useNow());

    return (
        <View className="border-m3-outline-variant min-h-18 flex-row items-center gap-4 border-b px-4 py-2">
            <View style={{ opacity: ARCHIVED_TILE_OPACITY }}>
                <CategoryIconTile
                    color={account.imageColor ?? account.customColor ?? colors.foreground}
                    emoji={account.emoji}
                    icon={account.icon}
                    imageUri={account.imageUri}
                    size={PARENT_TILE}
                    type="solid"
                />
            </View>
            <View className="flex-1">
                <Text className="text-body text-m3-on-surface" numberOfLines={1}>
                    {account.name}
                </Text>
                {account.archivedAt === null ? null : (
                    <Text className="text-caption text-m3-on-surface-variant" numberOfLines={1}>
                        {t("accounts.archived.on", { date: formatSentenceDate(account.archivedAt, language) })}
                    </Text>
                )}
            </View>
            <Text className="font-sans-medium text-body text-m3-on-surface-variant tabular-nums" numberOfLines={1}>
                {formatSignedAmount(balance.total, account.currency, showCents, language)}
            </Text>
            <Pressable
                accessibilityLabel={t("accounts.restore.a11y", { name: account.name })}
                accessibilityRole="button"
                hitSlop={RESTORE_HIT_SLOP}
                onPress={() => onRestore(account)}
            >
                <Text className="font-sans-medium text-caption text-m3-primary">{t("accounts.restore")}</Text>
            </Pressable>
        </View>
    );
}
