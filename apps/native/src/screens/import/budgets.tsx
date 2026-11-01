import { CategoryIconTile } from "@/components/category-icon-tile";
import { SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useTranslation } from "@/i18n/context";
import { moneyManagerSession, useMoneyManagerSession } from "@/lib/money-manager-session";

import { ImportRow } from "./components/import-row";
import { categoryLook, categoryName, money } from "./labels";

export function MoneyManagerBudgets() {
    const { draft } = useMoneyManagerSession();
    const t = useTranslation();
    if (draft === null) {
        return <SettingsScreen>{null}</SettingsScreen>;
    }
    const limited = draft.analysis.categories.filter((category) => category.limit !== null);

    return (
        <SettingsScreen>
            <SettingsSection footer={t("mmImport.budgets.footer")} title={t("mmImport.budgets.section")}>
                {limited.map((category) => {
                    const target = draft.choices.categories[category.uid];
                    const skipped = target === undefined || target.kind === "skip";
                    const look = categoryLook(draft, category.uid);
                    const name =
                        target?.kind === "existing" || target?.kind === "preset"
                            ? categoryName(draft, target, category.income)
                            : category.title;
                    return (
                        <ImportRow
                            detail={t("mmImport.budgets.from", { name: category.title })}
                            key={category.uid}
                            leading={<CategoryIconTile color={look.color} icon={look.icon} size={32} />}
                            testID={`mm-budget-${category.uid}`}
                            title={name}
                            toggle={
                                skipped
                                    ? undefined
                                    : {
                                          onValueChange: (value) =>
                                              moneyManagerSession.updateChoices((choices) => ({
                                                  ...choices,
                                                  budgets: { ...choices.budgets, [category.uid]: value },
                                              })),
                                          value: draft.choices.budgets[category.uid] ?? false,
                                      }
                            }
                            value={money(category.limit ?? 0, draft.snapshot.defaultCurrency)}
                        />
                    );
                })}
            </SettingsSection>
        </SettingsScreen>
    );
}
