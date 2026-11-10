import { createContext, useContext } from "react";

export type GoalFlow =
    | { kind: "create" }
    | { goalId: string; kind: "add" | "delete" | "edit" }
    | { account: string; kind: "unvalued" };

export const GoalFlowsContext = createContext<{ open: (flow: GoalFlow) => void }>({ open: () => undefined });

export const useGoalFlows = () => useContext(GoalFlowsContext);
