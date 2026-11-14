import { Dialog } from "panelui-web/dialog";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { DebtDialogs } from "./debt-dialogs";
import { DebtFlowsContext } from "./flow-context";
import type { DebtFlow } from "./flow-context";

interface OpenFlow {
    flow: DebtFlow | null;
    open: boolean;
}

export function DebtFlowsProvider({ children }: { children: ReactNode }) {
    const [{ flow, open }, setState] = useState<OpenFlow>({ flow: null, open: false });
    const setFlow = useCallback(
        (next: DebtFlow | null) => setState((last) => ({ flow: next ?? last.flow, open: next !== null })),
        []
    );
    const value = useMemo(() => ({ open: setFlow }), [setFlow]);
    return (
        <DebtFlowsContext value={value}>
            {children}
            <Dialog onOpenChange={(next) => next || setFlow(null)} open={open}>
                <Dialog.Content className="app-shell ph-no-capture" size="md">
                    {flow ? <DebtDialogs flow={flow} onClose={() => setFlow(null)} onSwitch={setFlow} /> : null}
                </Dialog.Content>
            </Dialog>
        </DebtFlowsContext>
    );
}
