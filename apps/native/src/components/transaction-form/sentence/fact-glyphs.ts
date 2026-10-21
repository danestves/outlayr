import Calendar03SolidIcon from "@hugeicons-pro/core-solid-rounded/Calendar03Icon";
import DivideSignCircleSolidIcon from "@hugeicons-pro/core-solid-rounded/DivideSignCircleIcon";
import NoteEditSolidIcon from "@hugeicons-pro/core-solid-rounded/NoteEditIcon";
import PercentCircleSolidIcon from "@hugeicons-pro/core-solid-rounded/PercentCircleIcon";
import RepeatSolidIcon from "@hugeicons-pro/core-solid-rounded/RepeatIcon";
import SparklesSolidIcon from "@hugeicons-pro/core-solid-rounded/SparklesIcon";
import Tag01SolidIcon from "@hugeicons-pro/core-solid-rounded/Tag01Icon";
import Calendar03Icon from "@hugeicons-pro/core-stroke-rounded/Calendar03Icon";
import DivideSignCircleIcon from "@hugeicons-pro/core-stroke-rounded/DivideSignCircleIcon";
import NoteEditIcon from "@hugeicons-pro/core-stroke-rounded/NoteEditIcon";
import PercentCircleIcon from "@hugeicons-pro/core-stroke-rounded/PercentCircleIcon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import RepeatIcon from "@hugeicons-pro/core-stroke-rounded/RepeatIcon";
import SparklesIcon from "@hugeicons-pro/core-stroke-rounded/SparklesIcon";
import Tag01Icon from "@hugeicons-pro/core-stroke-rounded/Tag01Icon";
import type { IconSvgElement } from "@hugeicons/react-native";

// No platform twin: `fact-chips.tsx` and its Android sibling share it.
export const FACT_GLYPHS = {
    add: { set: PlusSignIcon, unset: PlusSignIcon },
    fee: { set: PercentCircleSolidIcon, unset: PercentCircleIcon },
    icon: { set: SparklesSolidIcon, unset: SparklesIcon },
    installments: { set: Calendar03SolidIcon, unset: Calendar03Icon },
    note: { set: NoteEditSolidIcon, unset: NoteEditIcon },
    repeat: { set: RepeatSolidIcon, unset: RepeatIcon },
    split: { set: DivideSignCircleSolidIcon, unset: DivideSignCircleIcon },
    tags: { set: Tag01SolidIcon, unset: Tag01Icon },
} as const satisfies Record<string, { set: IconSvgElement; unset: IconSvgElement }>;

export type SentenceFactKey = keyof typeof FACT_GLYPHS;

export interface SentenceVerb {
    accessibilityLabel?: string;
    active: boolean;
    disabled?: boolean;
    key: SentenceFactKey;
    /** Once the fact is set this is its value ("monthly", "3 ways"), not the noun that offered it. */
    label: string;
    onPress: () => void;
    onRemove?: () => void;
    removeAccessibilityLabel?: string;
}
