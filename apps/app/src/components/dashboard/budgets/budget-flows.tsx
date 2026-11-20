import { Dialog } from "panelui-web/dialog";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { DialogContent } from "@/components/ui/dialog-content";

import { BudgetDialogs } from "./budget-dialogs";
import { BudgetFlowsContext } from "./flow-context";
import type { BudgetFlow } from "./flow-context";

interface OpenFlow {
    flow: BudgetFlow | null;
    open: boolean;
}

export function BudgetFlowsProvider({ children }: { children: ReactNode }) {
    const [{ flow, open }, setState] = useState<OpenFlow>({ flow: null, open: false });
    const setFlow = useCallback(
        (next: BudgetFlow | null) => setState((last) => ({ flow: next ?? last.flow, open: next !== null })),
        []
    );
    const value = useMemo(() => ({ open: setFlow }), [setFlow]);
    const wide = flow?.kind === "plan";
    return (
        <BudgetFlowsContext value={value}>
            {children}
            <Dialog onOpenChange={(next) => next || setFlow(null)} open={open}>
                <DialogContent size={wide ? "lg" : "md"}>
                    {flow ? <BudgetDialogs flow={flow} onClose={() => setFlow(null)} onSwitch={setFlow} /> : null}
                </DialogContent>
            </Dialog>
        </BudgetFlowsContext>
    );
}
