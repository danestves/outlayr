import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import * as Cause from "effect/Cause";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useSettingNumber } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useExpenseContributions, useMainBudget, usePerCategoryBudgets } from "@/data/budgets";
import { useNow } from "@/data/use-now";
import { balancesViewFor, storedBalancesView } from "@/domain/balances";
import type { BalancesView } from "@/domain/balances";
import { useTranslation } from "@/i18n/context";
import { Accounts } from "@/screens/accounts";
import { useAddMenu } from "@/screens/accounts/add-menu";
import { SILENT } from "@/state/atom-command";
import { setNumberSettingCommand } from "@/state/settings-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { BalancesCategories } from "./categories";
import { useGoalFlow } from "./goal-flow";
import { useLimitFlow } from "./limit-flow";

/** The Balances tab: Accounts and Categories behind one toggle, sharing the add menu and the sheets it opens. */
export function Balances() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const nowMs = useNow();
    const currency = useGlobalCurrency(db);
    const { view: param } = useLocalSearchParams<{ view?: string }>();
    const stored = useSettingNumber("balancesView");
    const saveView = useAtomAction(
        setNumberSettingCommand,
        { onFailure: (cause) => console.error("Saving the Balances view failed", Cause.squash(cause)) },
        SILENT
    );
    // One subscription for the tab: every limit hook below derives from it.
    const contributions = useExpenseContributions(db, nowMs);
    const mainRow = useMainBudget(db, nowMs, contributions);
    const allBudgets = usePerCategoryBudgets(db, nowMs, contributions);
    const view = balancesViewFor({ hasLimit: mainRow !== null || allBudgets.length > 0, param, stored });
    const limits = useLimitFlow({ allBudgets, contributions, currency, nowMs });
    const goals = useGoalFlow();

    // Kept in the route too, so a later link's `view` still wins over the last pick.
    const select = (next: BalancesView) => {
        router.setParams({ view: next });
        saveView({ db, key: "balancesView", value: storedBalancesView(next) });
    };
    const toggle = { onChange: select, view };

    const addMenu = useAddMenu({
        onCategoryLimit: () => {
            select("categories");
            limits.pickCategory();
        },
        onGoal: () => {
            select("accounts");
            goals.start();
        },
        onOverallLimit: () => {
            select("categories");
            // A pending delete still holds the singleton row, and a new one would overwrite it mid-undo.
            if (mainRow) {
                router.push("/balances/overall");
                return;
            }
            limits.openLimit({
                categoryId: null,
                limit: null,
                name: t("budgets.scope.everything").toLocaleLowerCase(),
                type: BUDGET_TYPE.month,
            });
        },
    });

    return (
        <>
            {view === "accounts" ? (
                <Accounts addMenu={addMenu} onAddGoal={goals.start} toggle={toggle} />
            ) : (
                <BalancesCategories
                    addMenu={addMenu}
                    allBudgets={allBudgets}
                    contributions={contributions}
                    currency={currency}
                    mainRow={mainRow}
                    nowMs={nowMs}
                    onLimit={limits.openLimit}
                    onPickCategory={limits.pickCategory}
                    toggle={toggle}
                />
            )}
            {limits.sheets}
            {goals.sheets}
        </>
    );
}
