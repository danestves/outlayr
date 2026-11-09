import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { useRouteContext } from "@tanstack/react-router";
import { lazy, Suspense, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { writeSettings } from "@/lib/ledger-settings";

import { Glyph } from "./glyph";
import type { AccountSort } from "./model";

export type AccountType = "bank" | "card" | "cash";

export type AccountFlow =
    | { accountId: string; kind: "archive" | "check" | "delete" | "edit" }
    | { kind: "create"; type: AccountType }
    | { accountId?: string; kind: "purchase" };

export interface FlowToast {
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

export function useLedgerDb() {
    return useRouteContext({ from: "/_account/app", select: (context) => context.dbClient });
}

const FlowDialogs = lazy(() => import("./flow-dialogs"));

const TOAST_MS = 6000;

function Toast({ onDone, toast }: { onDone: () => void; toast: FlowToast }) {
    const { flows } = useIntlayer("dashboard-accounts");
    // oxlint-disable-next-line outlayr/react-effect-budget -- a timer is an external system.
    useEffect(() => {
        const timer = setTimeout(() => {
            toast.onExpire?.();
            onDone();
        }, TOAST_MS);
        return () => clearTimeout(timer);
    }, [onDone, toast]);
    return (
        <output className="app-shell dash-toast ph-no-capture">
            <Glyph icon={Tick02Icon} className="text-app-income flex-none" size={17} />
            <span className="min-w-0 truncate">{toast.text}</span>
            {toast.onUndo ? (
                <button
                    onClick={() => {
                        toast.onUndo?.();
                        onDone();
                    }}
                    type="button"
                >
                    {flows.undo}
                </button>
            ) : null}
        </output>
    );
}

/** Holds the dialog that is open and the toast after it. A new toast first settles the one it replaces. */
export function AccountFlowsProvider({ children }: { children: ReactNode }) {
    const [flow, setFlow] = useState<AccountFlow | null>(null);
    const [toast, setToast] = useState<FlowToast | null>(null);
    const db = useLedgerDb();
    const shown = useRef<FlowToast | null>(null);
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
        [db]
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
            {flow ? (
                <Suspense fallback={null}>
                    <FlowDialogs flow={flow} onClose={() => setFlow(null)} onSwitch={setFlow} />
                </Suspense>
            ) : null}
            {toast ? <Toast onDone={clearToast} toast={toast} /> : null}
        </FlowsContext>
    );
}
