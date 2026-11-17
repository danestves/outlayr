import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

import type {
    useKeyboardShown as useKeyboardShownBase,
    useStageKeyboardHeight as useStageKeyboardHeightBase,
} from "./use-keyboard-shown";

// Android sends only the `Did` events, so the stage and CTA follow the keyboard once it has settled.
export const useStageKeyboardHeight: typeof useStageKeyboardHeightBase = useKeyboardHeight;

export const useKeyboardShown: typeof useKeyboardShownBase = () => useKeyboardHeight() > 0;
