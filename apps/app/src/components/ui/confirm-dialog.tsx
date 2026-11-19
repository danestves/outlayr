import { AlertDialog } from "panelui-web/alert-dialog";
import type { AlertDialogTone } from "panelui-web/alert-dialog";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
    action: ReactNode;
    body: ReactNode;
    cancel: ReactNode;
    onAction: () => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    title: ReactNode;
    tone?: AlertDialogTone;
}

export function ConfirmDialog({ action, body, cancel, onAction, onOpenChange, open, title, tone }: ConfirmDialogProps) {
    return (
        <AlertDialog onOpenChange={onOpenChange} open={open}>
            <AlertDialog.Content className="app-shell ph-no-capture" tone={tone}>
                <AlertDialog.Title>{title}</AlertDialog.Title>
                <AlertDialog.Description>{body}</AlertDialog.Description>
                <AlertDialog.Footer>
                    <AlertDialog.Cancel>{cancel}</AlertDialog.Cancel>
                    <AlertDialog.Action onClick={onAction}>{action}</AlertDialog.Action>
                </AlertDialog.Footer>
            </AlertDialog.Content>
        </AlertDialog>
    );
}
