import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useSheetInsets() {
    return { ...useSafeAreaInsets(), bottom: 0 };
}
