import { View } from "react-native";

import type { TransferLogRow } from "@/domain/transfer-log-rows";

import { AccountTile } from "./account-tile";

export const TILE_SIZE = 36;
export const TILE_RADIUS = 9;

export const BADGE_OFFSET = -5;
const BADGE_SIZE = 20;
const BADGE_RADIUS = 6;
const BADGE_RING = 2;

interface TransferTileProps {
    ends: NonNullable<TransferLogRow["ends"]>;
    future: boolean;
    radius?: number;
    size?: number;
}

export function TransferTile({ ends, future, radius = TILE_RADIUS, size = TILE_SIZE }: TransferTileProps) {
    return (
        <View>
            <AccountTile account={ends.from} future={future} radius={radius} size={size} />
            <View
                className="bg-background absolute"
                style={{
                    borderRadius: BADGE_RADIUS + BADGE_RING,
                    bottom: BADGE_OFFSET - BADGE_RING,
                    padding: BADGE_RING,
                    right: BADGE_OFFSET - BADGE_RING,
                }}
            >
                <AccountTile account={ends.to} future={future} radius={BADGE_RADIUS} size={BADGE_SIZE} />
            </View>
        </View>
    );
}
