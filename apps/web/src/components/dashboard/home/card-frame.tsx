import { Frame } from "panelui-web/frame";
import type { ReactNode } from "react";

export function CardFrame({
    action,
    children,
    className = "",
    footer,
    panelClassName = "",
    stackAction = false,
    title,
}: {
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    footer?: ReactNode;
    panelClassName?: string;
    stackAction?: boolean;
    title: ReactNode;
}) {
    return (
        <Frame className={`min-w-0 rounded-2xl ${className}`} variant="band">
            <Frame.Header
                className={`min-h-10 has-data-[slot=frame-action]:grid-cols-[auto_minmax(0,1fr)] ${stackAction ? "max-sm:grid-cols-[minmax(0,1fr)]! sm:[&>[data-slot=frame-title]]:row-span-2" : ""}`}
            >
                <Frame.Title as="h2" className="text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap">
                    {title}
                </Frame.Title>
                {action ? (
                    <Frame.Action
                        className={`min-w-0 justify-self-end ${stackAction ? "max-sm:col-start-1 max-sm:row-start-2 max-sm:mt-2 max-sm:justify-self-start" : ""}`}
                    >
                        {action}
                    </Frame.Action>
                ) : null}
            </Frame.Header>
            <Frame.Panel className={`relative flex-1 group-data-[variant=band]/frame:rounded-[10px] ${panelClassName}`}>
                {children}
            </Frame.Panel>
            {footer ? <Frame.Footer className="min-h-11 flex-wrap text-sm">{footer}</Frame.Footer> : null}
        </Frame>
    );
}
