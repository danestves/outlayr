import { Dialog } from "panelui-web/dialog";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { InstallmentFlowsContext } from "./flow-context";
import type { InstallmentFlow } from "./flow-context";
import { InstallmentDialogs } from "./installment-dialogs";

interface OpenFlow {
    flow: InstallmentFlow | null;
    open: boolean;
}

export function InstallmentFlowsProvider({ children }: { children: ReactNode }) {
    const [{ flow, open }, setState] = useState<OpenFlow>({ flow: null, open: false });
    const setFlow = useCallback(
        (next: InstallmentFlow | null) => setState((last) => ({ flow: next ?? last.flow, open: next !== null })),
        []
    );
    const value = useMemo(() => ({ open: setFlow }), [setFlow]);
    return (
        <InstallmentFlowsContext value={value}>
            {children}
            <Dialog onOpenChange={(next) => next || setFlow(null)} open={open}>
                <Dialog.Content className="app-shell ph-no-capture" size="md">
                    {flow ? <InstallmentDialogs flow={flow} onClose={() => setFlow(null)} onSwitch={setFlow} /> : null}
                </Dialog.Content>
            </Dialog>
        </InstallmentFlowsContext>
    );
}
