import FALLBACK_ICON from "@hugeicons/core-free-icons/MoreHorizontalCircle01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import type { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { useState } from "react";
import type { ReactNode } from "react";
import { useLocale } from "react-intlayer";

import { CATEGORY_ICONS } from "@/components/ledger/category-icons";
import type { PhotoUrls } from "@/components/ledger/overview";
import { cn } from "@/lib/utils";

export const NEUTRAL_TILE = "#767676";

const SIZES = {
    xl: { box: "size-11 rounded-xl", glyph: 22, initial: "text-base", emoji: "text-xl" },
    lg: { box: "size-[26px] rounded-lg", glyph: 14, initial: "text-[11px]", emoji: "text-sm" },
    md: { box: "size-6 rounded-md", glyph: 14, initial: "text-[11px]", emoji: "text-sm" },
    sm: { box: "size-5 rounded-[5px]", glyph: 12, initial: "text-[10px]", emoji: "text-xs" },
    xs: { box: "size-[15px] rounded-[5px]", glyph: 9, initial: "text-[8px]", emoji: "text-[9px]" },
} as const;

type TileSize = keyof typeof SIZES;

export interface TileLook {
    color: string | null;
    emoji: string | null;
    icon: string | null;
    imageKey?: string | null;
}

export type AccountLook = ReturnType<typeof accountLook>;

const INK = { dark: "text-[#131209]", light: "text-white", plain: "text-muted-foreground" } as const;

interface TileProps {
    children?: ReactNode;
    color: string;
    imageUrl?: string;
    ink: keyof typeof INK;
    size: TileSize;
}

function Tile({ children, color, imageUrl, ink, size }: TileProps) {
    const [failedUrl, setFailedUrl] = useState<string>();
    if (imageUrl && imageUrl !== failedUrl) {
        return (
            <img
                alt=""
                className={cn(SIZES[size].box, "shrink-0 bg-white object-cover")}
                onError={() => setFailedUrl(imageUrl)}
                src={imageUrl}
            />
        );
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
    plain?: boolean;
    size?: TileSize;
}

export function LookTile({ look, photos, plain = false, size = "md" }: LookTileProps) {
    const imageUrl = look.imageKey ? photos?.get(look.imageKey) : undefined;
    return (
        <Tile
            color={plain ? "var(--color-muted)" : (look.color ?? NEUTRAL_TILE)}
            imageUrl={imageUrl}
            ink={plain ? "plain" : "dark"}
            size={size}
        >
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

export function TransferTile({
    from,
    photos,
    to,
}: {
    from: AccountLook | null;
    photos?: PhotoUrls;
    to: AccountLook | null;
}) {
    return (
        <span className="relative shrink-0">
            {from ? <AccountTile account={from} photos={photos} size="lg" /> : <FeeTile />}
            {to ? (
                <span className="absolute -right-1.5 -bottom-1.5 rounded-[7px] bg-(--tile-ring) p-0.5">
                    <AccountTile account={to} photos={photos} size="xs" />
                </span>
            ) : null}
        </span>
    );
}

export function FeeTile() {
    return (
        <Tile color="var(--color-muted)" ink="plain" size="lg">
            <span className="text-[15px] leading-none font-semibold" aria-hidden>
                %
            </span>
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
