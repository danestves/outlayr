import { View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { ChoiceRow, SettingsSection } from "@/components/list/list-row";
import type { CategoryOverride, PlannedCategory } from "@/data/transfer-core";
import type { ReviewCategoryOption } from "@/hooks/use-import-review";
import { useTranslation } from "@/i18n/context";

interface NewCategoryChoicesProps {
    category: PlannedCategory;
    onPicked: (override: CategoryOverride | null) => void;
    options: readonly ReviewCategoryOption[];
    override: CategoryOverride | undefined;
}

export function NewCategoryChoices({ category, onPicked, options, override }: NewCategoryChoicesProps) {
    const t = useTranslation();
    const sameSide = options.filter((option) => option.income === category.income);

    return (
        <View>
            <SettingsSection title={t("mmImport.categorySheet.putIn")}>
                <ChoiceRow
                    detail={t("mmImport.categorySheet.newDetail", { name: category.name })}
                    label={t("mmImport.categorySheet.new")}
                    onPress={() => onPicked(null)}
                    selected={override === undefined}
                />
                <ChoiceRow
                    detail={t("import.reviewLeaveOutDetail")}
                    label={t("mmImport.accountSheet.leaveOut")}
                    onPress={() => onPicked({ kind: "skip" })}
                    selected={override?.kind === "skip"}
                />
            </SettingsSection>
            {sameSide.length === 0 ? null : (
                <SettingsSection title={t("mmImport.categorySheet.other")}>
                    {sameSide.map((option) => (
                        <ChoiceRow
                            key={option.id}
                            label={option.name}
                            leading={
                                <CategoryIconTile
                                    color={option.tile.color}
                                    emoji={option.tile.emoji}
                                    icon={option.tile.icon}
                                    size={28}
                                />
                            }
                            onPress={() => onPicked({ categoryId: option.id, kind: "existing" })}
                            selected={override?.kind === "existing" && override.categoryId === option.id}
                        />
                    ))}
                </SettingsSection>
            )}
        </View>
    );
}
