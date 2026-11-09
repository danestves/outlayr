import { useRouteContext } from "@tanstack/react-router";
import { createToaster, Toast } from "panelui-web/toast";
import { lazy, Suspense, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { OverlayPresence } from "@/components/dashboard/overlay-presence";
import { writeSettings } from "@/lib/ledger-settings";

import type { AccountSort } from "./model";

export type AccountType = "bank" | "card" | "cash";

export type AccountFlow =
    | { accountId: string; kind: "archive" | "check" | "delete" | "edit" }
    | { kind: "create"; type: AccountType }
    | { accountId?: string; kind: "purchase" }
    | { accountId: string; kind: "transfer" }
    | { accountId?: string; from?: string; kind: "entry" };

export interface FlowToast {
    /** A second, quieter line under the text. */
    detail?: string;
    failed?: boolean;
    /** Runs when the toast leaves without Undo, for a change that waits out its window before it is sent. */
    onExpire?: () => void;
    onUndo?: () => void;
    text: string;
}

interface AccountFlows {
    open: (flow: AccountFlow) => void;
    sort: (sort: AccountSort) => void;
    toast: (toast: FlowToast) => void;
}

const FlowsContext = createContext<AccountFlows>({
    open: () => undefined,
    sort: () => undefined,
    toast: () => undefined,
});

export const useAccountFlows = () => useContext(FlowsContext);

const OpenFlowContext = createContext<[AccountFlow | null, (flow: AccountFlow | null) => void]>([
    null,
    () => undefined,
]);

/** Holds the open flow above the ledger's providers, for the mobile bar, which renders outside them. */
export function FlowRoot({ children }: { children: ReactNode }) {
    const state = useState<AccountFlow | null>(null);
    return <OpenFlowContext value={state}>{children}</OpenFlowContext>;
}

export const useOpenFlow = () => useContext(OpenFlowContext)[1];

export function useLedgerDb() {
    return useRouteContext({ from: "/_account/app", select: (context) => context.dbClient });
}

const loadFlowDialogs = () => import("./flow-dialogs");
const FlowDialogs = lazy(loadFlowDialogs);

const TOAST_MS = 6000;
export const UNDO_HOLD_MS = TOAST_MS * 2;

// Held outside React: useToast() subscribes its caller.
const flowToasts = createToaster();

function ShowToast({ onDone, toast }: { onDone: () => void; toast: FlowToast }) {
    const { flows } = useIntlayer("dashboard-accounts");
    const undo = flows.undo.value;
    // oxlint-disable-next-line outlayr/react-effect-budget -- a timer is an external system.
    useEffect(() => {
        const id = flowToasts.add({
            actionProps: toast.onUndo
                ? {
                      children: undo,
                      onClick: () => {
                          toast.onUndo?.();
                          onDone();
                      },
                  }
                : undefined,
            description: toast.detail,
            timeout: 0,
            title: toast.text,
            type: toast.failed ? "destructive" : "success",
        });
        const timer = setTimeout(() => {
            toast.onExpire?.();
            onDone();
        }, TOAST_MS);
        return () => {
            clearTimeout(timer);
            flowToasts.close(id);
        };
    }, [onDone, toast, undo]);
    return null;
}

/** Holds the dialog that is open and the toast after it. A new toast first settles the one it replaces. */
export function AccountFlowsProvider({ children }: { children: ReactNode }) {
    const [flow, setFlow] = useContext(OpenFlowContext);
    const [toast, setToast] = useState<FlowToast | null>(null);
    const db = useLedgerDb();
    const shown = useRef<FlowToast | null>(null);
    // oxlint-disable-next-line outlayr/react-effect-budget -- a click on Add must not wait on the network for its form.
    useEffect(() => {
        void loadFlowDialogs();
    }, []);
    const flows = useMemo(
        () => ({
            open: setFlow,
            sort: (sort: AccountSort) => {
                void writeSettings(db, { accountsByHand: String(sort === "order") });
            },
            toast: (next: FlowToast) => {
                shown.current?.onExpire?.();
                shown.current = next;
                setToast(next);
            },
        }),
        [db, setFlow]
    );
    const clearToast = useMemo(
        () => () => {
            shown.current = null;
            setToast(null);
        },
        []
    );
    return (
        <FlowsContext value={flows}>
            {children}
            <OverlayPresence value={flow}>
                {(held) => (
                    <Suspense fallback={null}>
                        <FlowDialogs flow={held} onClose={() => setFlow(null)} onSwitch={setFlow} />
                    </Suspense>
                )}
            </OverlayPresence>
            {toast ? <ShowToast onDone={clearToast} toast={toast} /> : null}
            {/* Inline, because the portal would leave the shell's tokens and the capture mask behind. The wrapper stays
                see-through and click-through: the inline viewport keeps its height with no toast showing. */}
            <div className="app-shell ph-no-capture pointer-events-none fixed right-4 bottom-[max(24px,env(safe-area-inset-bottom))] left-4 z-70 flex justify-end bg-transparent! sm:right-6 sm:left-auto sm:w-90 [&_[data-slot=toast]]:pointer-events-auto">
                <Toast.Provider inline toastManager={flowToasts} />
            </div>
        </FlowsContext>
    );
}
