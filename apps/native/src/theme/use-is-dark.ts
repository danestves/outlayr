import { useTheme } from "panelui-native/theme";

/** Not RN's `useColorScheme`: uniwind never touches `Appearance`, so that misreports a scheme chosen in Settings. */
export function useIsDark(): boolean {
    return useTheme().theme === "dark";
}
