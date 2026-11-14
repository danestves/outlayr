import { useRouteContext } from "@tanstack/react-router";
import { Dialog } from "panelui-web/dialog";
import { createToaster, Toast } from "panelui-web/toast";
import { lazy, Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { Notice, NoticeHost } from "@/lib/commit-notices";
import type { PurchaseSeed } from "@/lib/installment-scan";
import { writeSettings } from "@/lib/ledger-settings";

import type { AccountValues } from "./account-form";
import type { AccountSort } from "./model";
import type { PurchaseValues } from "./purchase-form";

export type AccountType = "bank" | "card" | "cash";

export type AccountFlow =
    | { accountId: string; kind: "archive" | "check" | "delete" }
    | { accountId: string; draft?: AccountValues; kind: "edit" }
    | { draft?: AccountValues; kind: "create"; type: AccountType }
    | { accountId?: string; draft?: PurchaseValues; kind: "purchase"; seed?: PurchaseSeed }
    | { accountId?: string; kind: "scan" }
    | { accountId: string; kind: "transfer" }
    | { accountId?: string; from?: string; kind: "entry" };

interface AccountFlows {
    open: (flow: AccountFlow) => void;
    reopen: (flow: AccountFlow) => void;
    sort: (sort: AccountSort) => void;
    toast: NoticeHost["show"];
}

const FlowsContext = createContext<AccountFlows>({
    open: () => undefined,
    reopen: () => undefined,
    sort: () => undefined,
    toast: () => () => undefined,
});

export const useAccountFlows = () => useContext(FlowsContext);

interface OpenFlow {
    flow: AccountFlow | null;
    open: boolean;
}

type SetFlow = (flow: AccountFlow | null) => void;
type Reopen = (flow: AccountFlow) => void;

const OpenFlowContext = createContext<[OpenFlow, SetFlow, Reopen]>([
    { flow: null, open: false },
    () => undefined,
    () => undefined,
]);

/** Holds the open flow above the ledger's providers, for the mobile bar, which renders outside them. */
export function FlowRoot({ children }: { children: ReactNode }) {
    const [state, setState] = useState<OpenFlow>({ flow: null, open: false });
    const setFlow = useCallback(
        (next: AccountFlow | null) => setState((last) => ({ flow: next ?? last.flow, open: next !== null })),
        []
    );
    const reopen = useCallback(
        (flow: AccountFlow) => setState((last) => (last.open ? last : { flow, open: true })),
        []
    );
    const value = useMemo((): [OpenFlow, SetFlow, Reopen] => [state, setFlow, reopen], [state, setFlow, reopen]);
    return <OpenFlowContext value={value}>{children}</OpenFlowContext>;
}

export const useOpenFlow = () => useContext(OpenFlowContext)[1];

export function useLedgerDb() {
    return useRouteContext({ from: "/_account/_app", select: (context) => context.dbClient });
}

const loadFlowDialogs = () => import("./flow-dialogs");
const FlowDialogs = lazy(loadFlowDialogs);

const TOAST_MS = 6000;
export const UNDO_HOLD_MS = TOAST_MS * 2;

// Held outside React: useToast() subscribes its caller.
const flowToasts = createToaster();

function ShowToast({ onDone, toast }: { onDone: () => void; toast: Notice }) {
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
    const [{ flow, open }, setFlow, reopen] = useContext(OpenFlowContext);
    const { ledger } = useDashboard();
    const sortFailed = useIntlayer("dashboard-accounts").flows.reorderFailed.value;
    const [toast, setToast] = useState<Notice | null>(null);
    const db = useLedgerDb();
    const shown = useRef<Notice | null>(null);
    // oxlint-disable-next-line outlayr/react-effect-budget -- a click on Add must not wait on the network for its form.
    useEffect(() => {
        void loadFlowDialogs();
    }, []);
    const clearToast = useMemo(
        () => () => {
            shown.current = null;
            setToast(null);
        },
        []
    );
    const targetGone =
        (flow?.kind === "archive" || flow?.kind === "check" || flow?.kind === "delete" || flow?.kind === "edit") &&
        !ledger.books.accounts.some((row) => row.localId === flow.accountId && row.deletedAt === null);
    const flows = useMemo(() => {
        const show = (next: Notice) => {
            shown.current?.onExpire?.();
            shown.current = next;
            setToast(next);
            return () => {
                if (shown.current === next) {
                    clearToast();
                }
            };
        };
        return {
            open: setFlow,
            reopen,
            sort: (sort: AccountSort) => {
                writeSettings(db, { accountsByHand: String(sort === "order") }).catch(() => {
                    show({ failed: true, text: sortFailed });
                });
            },
            toast: show,
        };
    }, [clearToast, db, reopen, setFlow, sortFailed]);
    return (
        <FlowsContext value={flows}>
            {children}
            <Dialog onOpenChange={(next) => next || setFlow(null)} open={open && !targetGone}>
                <Dialog.Content
                    className="app-shell ph-no-capture"
                    size={flow?.kind === "entry" || flow?.kind === "purchase" ? "lg" : "md"}
                >
                    <Suspense fallback={null}>
                        {flow ? <FlowDialogs flow={flow} onClose={() => setFlow(null)} onSwitch={setFlow} /> : null}
                    </Suspense>
                </Dialog.Content>
            </Dialog>
            {toast ? <ShowToast onDone={clearToast} toast={toast} /> : null}
            {/* Inline, because the portal would leave the shell's tokens and the capture mask behind. The wrapper stays
                see-through and click-through: the inline viewport keeps its height with no toast showing. */}
            <div className="app-shell ph-no-capture pointer-events-none fixed right-4 bottom-[max(24px,env(safe-area-inset-bottom))] left-4 z-70 flex justify-end bg-transparent! sm:right-6 sm:left-auto sm:w-90 [&_[data-slot=toast]]:pointer-events-auto">
                <Toast.Provider inline toastManager={flowToasts} />
            </div>
        </FlowsContext>
    );
}
