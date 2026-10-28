import { View } from "react-native";

import { ListItemFrame, ListItemIcon, ListItemText } from "@/components/list/material-list-item";
import { SwatchStrip } from "@/components/settings/swatch-strip";

import type { AccentSwatchesProps } from "./accent-swatches";

export type { AccentSwatchesProps } from "./accent-swatches";

export function AccentSwatches({ icon, onChange, options, title, value }: AccentSwatchesProps) {
    return (
        <ListItemFrame>
            <ListItemIcon icon={icon} />
            <View className="flex-1">
                <ListItemText title={title} />
            </View>
            <SwatchStrip onChange={onChange} options={options} value={value} />
        </ListItemFrame>
    );
}
