import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { Eyebrow, PARENT_TILE } from "@/components/category-list-chrome";
import { ReorderList } from "@/components/reorder-list";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts } from "@/data/accounts";
import { accountsRepo } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

export function AccountReorder() {
    const db = useDatabase();
    const t = useTranslation();
    const colors = useColors();
    const rows = useBankAccounts(db);

    const reorder = (ids: string[]) => accountsRepo.reorder(db, ids);

    return (
        <ScrollView className="bg-m3-surface flex-1">
            <View className="px-4 pt-2 pb-2">
                <Eyebrow colors={colors}>{t("accounts.title")}</Eyebrow>
            </View>
            <ReorderList
                items={rows}
                keyOf={(account) => account.id}
                labelOf={(account) => account.name}
                onReorder={reorder}
                renderItem={(account) => (
                    <ReorderRow
                        account={account}
                        tint={account.imageColor ?? account.customColor ?? colors.foreground}
                    />
                )}
            />
        </ScrollView>
    );
}

function ReorderRow({ account, tint }: { account: Account; tint: string }) {
    return (
        <View className="flex-row items-center gap-4">
            <CategoryIconTile
                color={tint}
                emoji={account.emoji}
                icon={account.icon}
                imageUri={account.imageUri}
                size={PARENT_TILE}
                type="solid"
            />
            <Text className="text-body text-m3-on-surface flex-1" numberOfLines={1}>
                {account.name}
            </Text>
        </View>
    );
}
