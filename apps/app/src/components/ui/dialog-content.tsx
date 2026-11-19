import { Dialog } from "panelui-web/dialog";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Portaled outside the shell, so it carries the shell's tokens itself. */
export function DialogContent({ className, ...props }: ComponentProps<typeof Dialog.Content>) {
    return <Dialog.Content className={cn("app-shell ph-no-capture", className)} {...props} />;
}
