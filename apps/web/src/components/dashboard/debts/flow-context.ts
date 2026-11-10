import { createContext, useContext } from "react";

export type NewVerb = "borrowed" | "bought" | "lent" | "sold";

export type DebtFlow =
    | { kind: "new"; personId: string | null; verb: NewVerb }
    | { kind: "owe" }
    | { accountId: string; kind: "delete" | "pay" | "plan" | "rename" | "settle" };

export const DebtFlowsContext = createContext<{ open: (flow: DebtFlow) => void }>({ open: () => undefined });

export const useDebtFlows = () => useContext(DebtFlowsContext);
