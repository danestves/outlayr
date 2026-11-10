import { createContext, useContext } from "react";

export type InstallmentFlow =
    | { kind: "deletePending" | "pay" | "payAll"; planId: string }
    | { installmentId: string; kind: "edit"; planId: string };

export const InstallmentFlowsContext = createContext<{ open: (flow: InstallmentFlow) => void }>({
    open: () => undefined,
});

export const useInstallmentFlows = () => useContext(InstallmentFlowsContext);
