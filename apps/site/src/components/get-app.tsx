import { capture } from "@outlayr/shared/analytics";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import type { MouseEvent, ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { useIntlayer } from "react-intlayer";

import { DownloadQr } from "./qr-code";
import { StoreBadges } from "./store-badges";

export const DOWNLOAD_HREF = "/download?utm_source=site&utm_medium=cta";

const WIDE = "(min-width: 64rem) and (hover: hover) and (pointer: fine)";

let open = false;
const listeners = new Set<() => void>();

function setOpen(next: boolean) {
    open = next;
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function showGetApp(placement: string) {
    capture("get_app_qr_opened", { placement });
    setOpen(true);
}

function onGetApp(event: MouseEvent<HTMLElement>, placement: string) {
    capture("get_app_clicked", { placement });
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (!modified && matchMedia(WIDE).matches) {
        event.preventDefault();
        setOpen(true);
    }
}

export function GetAppButton({
    children,
    className,
    placement,
    tone,
}: {
    children: ReactNode;
    className?: string;
    placement: string;
    tone?: "glass";
}) {
    return (
        <Button
            aria-haspopup="dialog"
            className={className ? `rounded-full ${className}` : "rounded-full"}
            data-tone={tone}
            nativeButton={false}
            onClick={(event) => onGetApp(event, placement)}
            render={({ children: content, ...props }) => (
                <a {...props} href={DOWNLOAD_HREF}>
                    {content}
                </a>
            )}
        >
            {children}
        </Button>
    );
}

export function GetAppDialog() {
    const { getApp } = useIntlayer("site");
    const isOpen = useSyncExternalStore(
        subscribe,
        () => open,
        () => false
    );
    return (
        <Dialog onOpenChange={setOpen} open={isOpen}>
            <Dialog.Content className="get-app max-w-[27.5rem] text-center" showClose={false} size="sm" variant="plain">
                <Dialog.Close aria-label={getApp.close.value} className="get-app-close" icon />
                <div className="get-app-qr">
                    <DownloadQr label={getApp.qr.value} />
                </div>
                <Dialog.Title className="get-app-title">{getApp.title}</Dialog.Title>
                <Dialog.Description className="get-app-line">{getApp.line}</Dialog.Description>
                <div className="mt-6 flex justify-center">
                    <StoreBadges placement="dialog" size="sm" />
                </div>
            </Dialog.Content>
        </Dialog>
    );
}
