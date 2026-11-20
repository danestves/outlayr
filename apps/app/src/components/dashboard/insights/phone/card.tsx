import { Frame } from "panelui-web/frame";
import type { ReactNode } from "react";

import { FIGURE } from "../parts";

export const MONO = `${FIGURE} text-app-label`;

interface PhoneCardProps {
    aside?: ReactNode;
    children: ReactNode;
    className?: string;
    title: ReactNode;
}

/** The phone's card: a tray with the panel set 7px in on three sides, its title on the strip above. */
export function PhoneCard({ aside, children, className = "", title }: PhoneCardProps) {
    return (
        <Frame
            className={`border-border min-w-0 border px-1.75 pt-0 pb-1.75 ${className}`}
            render={<section />}
            variant="band"
        >
            <Frame.Header className="h-10.75 group-data-[variant=band]/frame:py-0">
                <Frame.Title as="h2" className="group-data-[variant=band]/frame:text-muted-foreground truncate">
                    {title}
                </Frame.Title>
                {aside ? (
                    <Frame.Action className="text-app-label row-span-1 whitespace-nowrap">{aside}</Frame.Action>
                ) : null}
            </Frame.Header>
            <Frame.Panel className="group-data-[variant=band]/frame:rounded-app-xl relative flex-1 group-data-[variant=band]/frame:shadow-none">
                {children}
            </Frame.Panel>
        </Frame>
    );
}

/** The figure at the right of a card's title, with the word that names it. */
export function Aside({ label, value }: { label?: string; value: string }) {
    return (
        <>
            {label ? `${label} ` : null}
            <b className={`${MONO} text-foreground font-medium`}>{value}</b>
        </>
    );
}

export function Nothing({ children }: { children: ReactNode }) {
    return <p className="text-muted-foreground text-app-body px-3.75 py-3.5">{children}</p>;
}

/** The frame's 8px key, smaller than the tabs' swatch. */
export function Key({ color }: { color: string }) {
    return <span aria-hidden className="size-2 shrink-0 rounded-xs" style={{ background: color }} />;
}
