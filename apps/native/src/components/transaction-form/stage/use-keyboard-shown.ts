import { useArrivingKeyboardHeight } from "@/hooks/use-keyboard-height";

// The `Will` events, so the stage moves with the keyboard rather than after it. iOS only: Android never sends them.
export function useKeyboardShown(): boolean {
    return useArrivingKeyboardHeight() > 0;
}
