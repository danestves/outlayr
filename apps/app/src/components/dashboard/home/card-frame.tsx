import { Frame } from "panelui-web/frame";
import type { ReactNode } from "react";

export function CardFrame({
    action,
    children,
    className = "",
    footer,
    headerClassName = "",
    panelClassName = "",
    stackAction = false,
    title,
}: {
    action?: ReactNode;
    children?: ReactNode;
    className?: string;
    footer?: ReactNode;
    headerClassName?: string;
    panelClassName?: string;
    stackAction?: boolean;
    title: ReactNode;
}) {
    return (
        <Frame className={`min-w-0 rounded-2xl ${className}`} variant="band">
            <Frame.Header
                className={`min-h-10 has-data-[slot=frame-action]:grid-cols-[auto_minmax(0,1fr)] ${stackAction ? "max-sm:grid-cols-[minmax(0,1fr)]! sm:[&>[data-slot=frame-title]]:row-span-2" : ""} ${headerClassName}`}
            >
                <Frame.Title
                    as="h2"
                    className="text-[15px] leading-5 font-semibold tracking-[-0.01em] whitespace-nowrap"
                >
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
            {children ? (
                <Frame.Panel
                    className={`relative flex-1 group-data-[variant=band]/frame:rounded-[10px] dark:group-data-[variant=band]/frame:shadow-[0_1px_2px_#0003] ${panelClassName}`}
                >
                    {children}
                </Frame.Panel>
            ) : null}
            {footer ? (
                <Frame.Footer className="min-h-11 flex-wrap text-sm group-data-[variant=band]/frame:pe-2 group-data-[variant=band]/frame:pt-[7px] group-data-[variant=band]/frame:pb-[3px]">
                    {footer}
                </Frame.Footer>
            ) : null}
        </Frame>
    );
}
