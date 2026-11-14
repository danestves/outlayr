import { Dialog } from "panelui-web/dialog";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { GoalFlowsContext } from "./flow-context";
import type { GoalFlow } from "./flow-context";
import { GoalDialogs } from "./goal-dialogs";

interface OpenFlow {
    flow: GoalFlow | null;
    open: boolean;
}

export function GoalFlowsProvider({ children }: { children: ReactNode }) {
    const [{ flow, open }, setState] = useState<OpenFlow>({ flow: null, open: false });
    const setFlow = useCallback(
        (next: GoalFlow | null) => setState((last) => ({ flow: next ?? last.flow, open: next !== null })),
        []
    );
    const value = useMemo(() => ({ open: setFlow }), [setFlow]);
    return (
        <GoalFlowsContext value={value}>
            {children}
            <Dialog onOpenChange={(next) => next || setFlow(null)} open={open}>
                <Dialog.Content className="app-shell ph-no-capture" showClose={flow?.kind !== "unvalued"} size="md">
                    {flow ? <GoalDialogs flow={flow} onClose={() => setFlow(null)} onSwitch={setFlow} /> : null}
                </Dialog.Content>
            </Dialog>
        </GoalFlowsContext>
    );
}
