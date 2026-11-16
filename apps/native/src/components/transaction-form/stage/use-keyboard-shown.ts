import { useArrivingKeyboardHeight } from "@/hooks/use-keyboard-height";

// The `Will` events, so the stage moves with the keyboard rather than after it. iOS only: Android never sends them.
export function useStageKeyboardHeight(): number {
    return useArrivingKeyboardHeight();
}

export function useKeyboardShown(): boolean {
    return useStageKeyboardHeight() > 0;
}
