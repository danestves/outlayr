import FALLBACK_ICON from "@hugeicons/core-free-icons/MoreHorizontalCircle01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { CSSProperties } from "react";

import { CATEGORY_ICONS } from "@/components/ledger/category-icons";
import { cn } from "@/lib/utils";

export interface CategoryLook {
    emoji: string | null;
    icon: string | null;
}

interface CategoryTileProps {
    className?: string;
    color: string;
    look: CategoryLook | undefined;
}

export function CategoryTile({ className, color, look }: CategoryTileProps) {
    const style: CSSProperties & Record<"--tile", string> = { "--tile": color };
    const icon = look?.icon ? CATEGORY_ICONS.get(look.icon) : undefined;
    return (
        <span
            aria-hidden
            className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--tile)_22%,transparent)] text-[color-mix(in_oklab,var(--tile)_78%,var(--color-foreground))]",
                className
            )}
            style={style}
        >
            {look?.emoji && !look.icon ? (
                <span className="text-xs leading-none">{look.emoji}</span>
            ) : (
                <HugeiconsIcon icon={icon ?? FALLBACK_ICON} size={12} strokeWidth={2.2} />
            )}
        </span>
    );
}
