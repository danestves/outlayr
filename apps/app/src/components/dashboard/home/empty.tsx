import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

export function Empty({
    action,
    icon,
    line,
    title,
}: {
    action?: ReactNode;
    icon: IconSvgElement;
    line?: ReactNode;
    title: ReactNode;
}) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-6 py-10 text-center">
            <span className="bg-app-fill text-muted-foreground rounded-app-lg mb-2 flex size-11 items-center justify-center">
                <HugeiconsIcon icon={icon} size={20} strokeWidth={1.5} />
            </span>
            <b className="text-app-title font-semibold">{title}</b>
            {line ? <p className="text-muted-foreground text-app-label max-w-80">{line}</p> : null}
            {action ? <div className="mt-2.5 flex flex-wrap justify-center gap-2">{action}</div> : null}
        </div>
    );
}
