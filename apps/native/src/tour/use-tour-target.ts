import { useRef } from "react";
import type { ViewInstance } from "react-native";

import { useTour } from "./tour-context";

export function useTourTarget(
    id: string,
    radius: number | "half",
    reveal?: (node: ViewInstance) => Promise<void>
): (node: ViewInstance | null) => void {
    const { register, unregister } = useTour();
    const attached = useRef<ViewInstance | null>(null);

    return (node: ViewInstance | null) => {
        if (attached.current) {
            unregister(id, attached.current);
        }
        attached.current = node;
        if (node) {
            register(id, { node, radius, reveal });
        }
    };
}
