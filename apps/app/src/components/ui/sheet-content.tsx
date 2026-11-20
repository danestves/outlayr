import { Sheet } from "panelui-web/sheet";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Portaled outside the shell, so it carries the shell's tokens itself. */
export function SheetContent({ className, ...props }: ComponentProps<typeof Sheet.Content>) {
    return <Sheet.Content className={cn("app-shell ph-no-capture", className)} {...props} />;
}
