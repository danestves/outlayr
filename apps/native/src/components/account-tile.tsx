import { isPerson } from "@outlayr/money/account-kind";
import { Text } from "react-native";

import type { Account } from "@/data/accounts-core";
import { useColors } from "@/theme/use-colors";

import type { CategoryIconType } from "./category-icon";
import { CategoryIconTile } from "./category-icon-tile";

const WORDS = /[^\p{L}\p{N}]+/u;

/** "Ana María" reads "AM", "Pedro" reads "P". */
function initials(name: string): string {
    const words = name.trim().split(WORDS).filter(Boolean);
    const letters = [words[0], words.length > 1 ? words.at(-1) : undefined].map((word) => [...(word ?? "")][0] ?? "");
    return letters.join("").toLocaleUpperCase();
}

function initialsGlyph(name: string) {
    function Initials({ color, size }: { color: string; size: number }) {
        return (
            <Text allowFontScaling={false} className="font-sans-semibold" style={{ color, fontSize: size * 0.8 }}>
                {initials(name)}
            </Text>
        );
    }
    return Initials;
}

interface AccountTileProps {
    account: Pick<Account, "customColor" | "emoji" | "icon" | "imageColor" | "imageUri" | "kind" | "name">;
    future?: boolean;
    radius?: number;
    size: number;
    type?: CategoryIconType;
}

export function AccountTile({ account, future, radius, size, type = "solid" }: AccountTileProps) {
    const colors = useColors();
    const color = account.imageColor ?? account.customColor ?? colors.foreground;
    if (isPerson(account)) {
        return (
            <CategoryIconTile
                color={account.customColor ?? colors.foreground}
                future={future}
                glyph={initialsGlyph(account.name)}
                icon={null}
                radius={radius}
                size={size}
                type={type}
            />
        );
    }
    return (
        <CategoryIconTile
            color={color}
            emoji={account.emoji}
            future={future}
            icon={account.icon}
            imageUri={account.imageUri}
            radius={radius}
            size={size}
            type={type}
        />
    );
}
