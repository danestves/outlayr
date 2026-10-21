import { toast } from "panelui-native/components/toast";
import type { ToastHandle } from "panelui-native/components/toast";

import { NoticeSlip } from "@/components/notice-slip";
import type { NoticeSlipProps, NoticeTone } from "@/components/notice-slip";

/**
 * Questions keep their `Alert`: a toast can be swiped away, so it can't carry a destructive choice. So do failures
 * on a `formSheet` or `modal` that stays up, because a native presentation covers the root toast viewport.
 */

const NOTICE_MS = 6000;
const ACTIONABLE_MS = 10_000;

interface Notice {
    actionLabel?: string;
    body?: string;
    onActionPress?: (handle: ToastHandle) => void;
    title: string;
}

interface SavedEntry {
    amount: NonNullable<NoticeSlipProps["amount"]>;
    stamp: string;
    tone: Extract<NoticeTone, { kind: "entry" | "transfer" }>;
}

function show(
    notice: Notice & Pick<NoticeSlipProps, "amount" | "stamp" | "tone">,
    duration = notice.actionLabel ? ACTIONABLE_MS : NOTICE_MS
): string {
    return toast.show({
        component: (handle) => (
            <NoticeSlip
                actionLabel={notice.actionLabel}
                amount={notice.amount}
                body={notice.body}
                onAction={() => {
                    notice.onActionPress?.(handle);
                    handle.hide();
                }}
                onDismiss={handle.hide}
                stamp={notice.stamp}
                title={notice.title}
                tone={notice.tone}
            />
        ),
        duration,
        placement: "top",
    });
}

export function notifyFailure(notice: Notice): void {
    show({ ...notice, tone: { kind: "failure" } });
}

export function notifyWarning(notice: Notice): void {
    show({ ...notice, tone: { kind: "warning" } });
}

/** Returns the toast id: the undo window closes when the write commits, which the caller owns. */
export function notifyUndoable(notice: Notice & { duration: number }): string {
    return show({ ...notice, tone: { kind: "removed" } }, notice.duration);
}

export function notifySaved(notice: Notice & SavedEntry): void {
    show(notice);
}

export function dismissNotice(id: string): void {
    toast.hide(id);
}
