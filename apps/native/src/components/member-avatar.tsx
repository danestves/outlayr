import { Text, View } from "react-native";

import { withAlpha } from "@/theme/shade";

const PALETTE = ["#c2371b", "#8a5cc2", "#c27a1b", "#2f6f9f", "#1f7a5a"] as const;

const FONT_SIZE = { 16: 8, 20: 10, 24: 11, 32: 13, 40: 16, 56: 22 } as const;

export type MemberAvatarSize = keyof typeof FONT_SIZE;

const HASH_LIMIT = 1_000_003;

function colorFor(id: string): string {
    let hash = 0;
    for (const character of id) {
        hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % HASH_LIMIT;
    }
    return PALETTE[hash % PALETTE.length] ?? PALETTE[0];
}

function firstLetter(name: string): string {
    return ([...name.trim()][0] ?? "?").toLocaleUpperCase();
}

interface MemberAvatarProps {
    id: string;
    name: string;
    size?: MemberAvatarSize;
}

/** People only: accounts and categories have their own tiles. */
export function MemberAvatar({ id, name, size = 32 }: MemberAvatarProps) {
    const color = colorFor(id);
    return (
        <View
            accessible={false}
            style={{
                alignItems: "center",
                backgroundColor: withAlpha(color, 0.22),
                borderRadius: size / 2,
                height: size,
                justifyContent: "center",
                width: size,
            }}
        >
            <Text maxFontSizeMultiplier={1} style={{ color, fontSize: FONT_SIZE[size], fontWeight: "700" }}>
                {firstLetter(name)}
            </Text>
        </View>
    );
}
