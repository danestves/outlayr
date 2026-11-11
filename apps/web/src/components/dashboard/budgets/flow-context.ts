import type { MonthKey } from "@outlayr/money/year-plan";
import { createContext, useContext } from "react";

export type BudgetFlow =
    | { categoryId: string | null; kind: "new" }
    | { kind: "overall" }
    | { budgetId: string; kind: "delete" | "edit" }
    | { categoryId: string | null; income: boolean; kind: "plan"; month: MonthKey }
    | { categoryId: string; kind: "trim"; month: MonthKey };

export const BudgetFlowsContext = createContext<{ open: (flow: BudgetFlow) => void }>({ open: () => undefined });

export const useBudgetFlows = () => useContext(BudgetFlowsContext);
