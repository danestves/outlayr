import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

const PRINT_CSS = `
#rp-print { position: fixed; top: 0; left: -10000px; width: 1000px; visibility: hidden; pointer-events: none; }
@media print {
    body > *:not(#rp-print) { display: none !important; }
    #rp-print { position: static; width: auto; visibility: visible; padding: 24px; color: #111; background: #fff; }
    @page { margin: 12mm; }
}`;

interface PrintSheetProps {
    children: ReactNode;
    onDone: () => void;
    title: string;
}

/** Prints what it holds through the browser's own print dialog, in the light theme whatever the app wears. */
export function PrintSheet({ children, onDone, title }: PrintSheetProps) {
    // oxlint-disable-next-line outlayr/react-effect-budget -- swaps the page theme and title and opens the browser print dialog.
    useEffect(() => {
        const root = document.documentElement;
        const { theme } = root.dataset;
        const previousTitle = document.title;
        root.dataset.theme = "light";
        document.title = title;
        const restore = () => {
            if (theme === undefined) {
                delete root.dataset.theme;
            } else {
                root.dataset.theme = theme;
            }
            document.title = previousTitle;
        };
        const finish = () => {
            restore();
            onDone();
        };
        window.addEventListener("afterprint", finish, { once: true });
        const frame = requestAnimationFrame(() => window.print());
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("afterprint", finish);
            restore();
        };
    }, [onDone, title]);
    return createPortal(
        <div id="rp-print">
            <style>{PRINT_CSS}</style>
            {children}
        </div>,
        document.body
    );
}
