import AddCircleSolidIcon from "@hugeicons-pro/core-solid-rounded/AddCircleIcon";
import AlertCircleSolidIcon from "@hugeicons-pro/core-solid-rounded/AlertCircleIcon";
import CheckmarkCircle02SolidIcon from "@hugeicons-pro/core-solid-rounded/CheckmarkCircle02Icon";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import CircleIcon from "@hugeicons-pro/core-stroke-rounded/CircleIcon";
import Search01Icon from "@hugeicons-pro/core-stroke-rounded/Search01Icon";
import StarIcon from "@hugeicons-pro/core-stroke-rounded/StarIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";

import type { AppSymbol as AppSymbolBase, AppSymbolName } from "./app-symbol";

const GLYPHS = {
    "checkmark.circle.fill": CheckmarkCircle02SolidIcon,
    circle: CircleIcon,
    "exclamationmark.circle.fill": AlertCircleSolidIcon,
    magnifyingglass: Search01Icon,
    "plus.circle.fill": AddCircleSolidIcon,
    star: StarIcon,
    xmark: Cancel01Icon,
} as const satisfies Record<AppSymbolName, IconSvgElement>;

export const AppSymbol: typeof AppSymbolBase = ({ name, size = 24, tintColor }) => (
    <HugeiconsIcon color={tintColor} icon={GLYPHS[name]} size={size} />
);
