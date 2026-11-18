import { capture } from "@outlayr/shared/analytics";
import { Button } from "panelui-web/button";
import type { MouseEvent, ReactNode } from "react";
import { lazy, Suspense, useSyncExternalStore } from "react";

import { opensStore } from "@/lib/download";

const GetAppPanel = lazy(async () => {
    const module = await import("./get-app-panel");
    return { default: module.GetAppPanel };
});

export const DOWNLOAD_HREF = "/download?utm_source=site&utm_medium=cta";

let mounted = false;
let open = false;
const listeners = new Set<() => void>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

function setOpen(next: boolean) {
    mounted = true;
    open = next;
    emit();
}

export function warmGetApp() {
    if (!mounted) {
        mounted = true;
        emit();
    }
}

function warmUnlessStore() {
    if (!opensStore(navigator.userAgent)) {
        warmGetApp();
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

function onGetApp(event: MouseEvent<HTMLElement>, placement: string, onDialog?: () => void) {
    capture("get_app_clicked", { placement });
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (!modified && !opensStore(navigator.userAgent)) {
        event.preventDefault();
        onDialog?.();
        setOpen(true);
    }
}

export function GetAppButton({
    children,
    className,
    onDialog,
    placement,
    tone,
}: {
    children: ReactNode;
    className?: string;
    onDialog?: () => void;
    placement: string;
    tone?: "glass";
}) {
    return (
        <Button
            aria-haspopup="dialog"
            className={className ? `rounded-full ${className}` : "rounded-full"}
            data-tone={tone}
            nativeButton={false}
            onClick={(event) => onGetApp(event, placement, onDialog)}
            onFocus={warmUnlessStore}
            onPointerEnter={warmUnlessStore}
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
    const isMounted = useSyncExternalStore(
        subscribe,
        () => mounted,
        () => false
    );
    const isOpen = useSyncExternalStore(
        subscribe,
        () => open,
        () => false
    );
    if (!isMounted) {
        return null;
    }
    return (
        <Suspense fallback={null}>
            <GetAppPanel onOpenChange={setOpen} open={isOpen} />
        </Suspense>
    );
}
