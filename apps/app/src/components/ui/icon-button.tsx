import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import type { ButtonProps } from "panelui-web/button";

const SIZES = { lg: "icon-lg", md: "icon", sm: "icon-sm" } as const satisfies Record<string, ButtonProps["size"]>;

export interface IconButtonProps extends Omit<ButtonProps, "aria-label" | "children" | "loading" | "size"> {
    icon: IconSvgElement;
    label: string;
    size?: keyof typeof SIZES;
}

export function IconButton({ icon, label, size = "md", variant = "ghost", ...props }: IconButtonProps) {
    return (
        <Button aria-label={label} size={SIZES[size]} variant={variant} {...props}>
            <HugeiconsIcon icon={icon} strokeWidth={2} />
        </Button>
    );
}
