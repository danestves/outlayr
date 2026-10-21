import type { ReactNode } from "react";
import { View } from "react-native";

// Compose's `ModalBottomSheet` cancels a gesture-handler pan after its 8dp slop. Granting RN's responder blocks the
// native one, `RNHostView` passes that up to Compose, and the sheet leaves the drag to the content.
export function SheetDragRegion({ children }: { children: ReactNode }) {
    return (
        <View
            collapsable={false}
            onResponderGrant={() => true}
            onResponderTerminationRequest={() => false}
            onStartShouldSetResponder={() => true}
        >
            {children}
        </View>
    );
}
