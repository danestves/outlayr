import FALLBACK_ICON from "@hugeicons/core-free-icons/MoreHorizontalCircle01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import type { ReactNode } from "react";
import { useLocale } from "react-intlayer";

import { CATEGORY_ICONS } from "@/components/ledger/category-icons";
import type { PhotoUrls } from "@/components/ledger/overview";
import { cn } from "@/lib/utils";

export const NEUTRAL_TILE = "#767676";

const SIZES = {
    md: { box: "size-6 rounded-md", glyph: 14, initial: "text-[11px]", emoji: "text-sm" },
    sm: { box: "size-5 rounded-[5px]", glyph: 12, initial: "text-[10px]", emoji: "text-xs" },
} as const;

type TileSize = keyof typeof SIZES;

export interface TileLook {
    color: string | null;
    emoji: string | null;
    icon: string | null;
    imageKey?: string | null;
}

export type AccountLook = ReturnType<typeof accountLook>;

const INK = { dark: "text-[#131209]", light: "text-white", plain: "text-foreground" } as const;

interface TileProps {
    children?: ReactNode;
    color: string;
    imageUrl?: string;
    ink: keyof typeof INK;
    size: TileSize;
}

function Tile({ children, color, imageUrl, ink, size }: TileProps) {
    if (imageUrl) {
        return <img alt="" className={cn(SIZES[size].box, "shrink-0 bg-white object-cover")} src={imageUrl} />;
    }
    return (
        <span
            aria-hidden
            className={cn(SIZES[size].box, "flex shrink-0 items-center justify-center", INK[ink])}
            style={{ backgroundColor: color }}
        >
            {children}
        </span>
    );
}

function Glyph({ icon, size }: { icon: IconSvgElement; size: TileSize }) {
    return <HugeiconsIcon icon={icon} size={SIZES[size].glyph} strokeWidth={2} />;
}

function SymbolGlyph({ look, size }: { look: Pick<TileLook, "emoji" | "icon">; size: TileSize }) {
    if (!look.icon && look.emoji) {
        return <span className={cn("leading-none", SIZES[size].emoji)}>{look.emoji}</span>;
    }
    return <Glyph icon={(look.icon && CATEGORY_ICONS.get(look.icon)) || FALLBACK_ICON} size={size} />;
}

interface LookTileProps {
    look: TileLook;
    photos?: PhotoUrls;
    size?: TileSize;
}

export function LookTile({ look, photos, size = "md" }: LookTileProps) {
    const imageUrl = look.imageKey ? photos?.get(look.imageKey) : undefined;
    return (
        <Tile color={look.color ?? NEUTRAL_TILE} imageUrl={imageUrl} ink="dark" size={size}>
            <SymbolGlyph look={look} size={size} />
        </Tile>
    );
}

const WORDS = /[^\p{L}\p{N}]+/u;

function initialsOf(name: string, locale: string) {
    const words = name.trim().split(WORDS).filter(Boolean);
    return [words[0], words.length > 1 ? words.at(-1) : undefined]
        .map((word) => [...(word ?? "")][0] ?? "")
        .join("")
        .toLocaleUpperCase(locale);
}

export function AccountTile({
    account,
    photos,
    size = "md",
}: {
    account: AccountLook;
    photos?: PhotoUrls;
    size?: TileSize;
}) {
    const { locale } = useLocale();
    const imageUrl = account.imageKey ? photos?.get(account.imageKey) : undefined;
    return (
        <Tile
            color={account.color ?? "var(--color-muted)"}
            imageUrl={imageUrl}
            ink={account.color ? "light" : "plain"}
            size={size}
        >
            {account.person ? (
                <span className={cn("font-semibold", SIZES[size].initial)}>{initialsOf(account.name, locale)}</span>
            ) : (
                <SymbolGlyph look={account} size={size} />
            )}
        </Tile>
    );
}

export function MerchantTile({ imageUrl, name, size = "sm" }: { imageUrl?: string; name: string; size?: TileSize }) {
    const { locale } = useLocale();
    return (
        <Tile color="var(--color-muted)" imageUrl={imageUrl} ink="plain" size={size}>
            <span className={cn("font-semibold", SIZES[size].initial)}>
                {[...name.trim()][0]?.toLocaleUpperCase(locale)}
            </span>
        </Tile>
    );
}
