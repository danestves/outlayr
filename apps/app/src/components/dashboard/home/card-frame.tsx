import { Frame } from "panelui-web/frame";
import type { ReactNode } from "react";

export function CardFrame({
    action,
    children,
    className = "",
    footer,
    headerClassName = "",
    highlighted = false,
    panelClassName = "",
    stackAction = false,
    title,
}: {
    action?: ReactNode;
    children?: ReactNode;
    className?: string;
    footer?: ReactNode;
    headerClassName?: string;
    highlighted?: boolean;
    panelClassName?: string;
    stackAction?: boolean;
    title: ReactNode;
}) {
    return (
        <Frame
            className={`rounded-app-xl min-w-0 ${highlighted ? "ring-app-tint ring-1" : ""} ${className}`}
            variant="band"
        >
            <Frame.Header
                className={`min-h-10 has-data-[slot=frame-action]:grid-cols-[auto_minmax(0,1fr)] ${stackAction ? "max-sm:grid-cols-[minmax(0,1fr)]! sm:[&>[data-slot=frame-title]]:row-span-2" : ""} ${headerClassName}`}
            >
                <Frame.Title as="h2" className="whitespace-nowrap">
                    <span className="text-app-title font-semibold">{title}</span>
                </Frame.Title>
                {action ? (
                    <Frame.Action
                        className={`min-w-0 justify-self-end ${stackAction ? "max-sm:col-start-1 max-sm:row-start-2 max-sm:mt-2 max-sm:justify-self-start" : ""}`}
                    >
                        {action}
                    </Frame.Action>
                ) : null}
            </Frame.Header>
            {children ? (
                <Frame.Panel
                    className={`group-data-[variant=band]/frame:rounded-app-md relative flex-1 dark:group-data-[variant=band]/frame:shadow-(--shadow-app-panel) ${panelClassName}`}
                >
                    {children}
                </Frame.Panel>
            ) : null}
            {footer ? (
                <Frame.Footer className="text-app-body min-h-11 flex-wrap group-data-[variant=band]/frame:py-1 group-data-[variant=band]/frame:pe-2">
                    {footer}
                </Frame.Footer>
            ) : null}
        </Frame>
    );
}
