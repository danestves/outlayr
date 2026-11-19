import { Menu } from "panelui-web/menu";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Portaled outside the shell, so it carries the shell's tokens itself. The canvas opens menus `instant`. */
export function MenuContent({ className, ...props }: ComponentProps<typeof Menu.Content>) {
    return <Menu.Content className={cn("app-shell ph-no-capture transition-none", className)} {...props} />;
}
