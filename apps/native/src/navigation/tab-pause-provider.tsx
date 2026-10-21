import { useRoute } from "expo-router";
import { useNavigationState } from "expo-router/react-navigation";
import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";

import { createTabPause, TabPauseContext } from "@/data/tab-pause";

/**
 * Every tab stays mounted and NativeTabs freezes none, so background live reads would re-render on every write.
 * Selection comes from the tab navigator, not `useIsFocused`, which also turns false under a modal.
 */
export function TabPauseProvider({ children }: { children: ReactNode }) {
    const routeKey = useRoute().key;
    const selected = useNavigationState((state) => state.routes[state.index]?.key === routeKey);
    const [pause] = useState(createTabPause);

    // Layout rather than passive, so the replay renders in the same task as the commit that selected the tab.
    useLayoutEffect(() => {
        pause.setSelected(selected);
    }, [pause, selected]);

    return <TabPauseContext.Provider value={pause}>{children}</TabPauseContext.Provider>;
}
