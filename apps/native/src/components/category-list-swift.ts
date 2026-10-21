import { font } from "@expo/ui/swift-ui/modifiers";
import { PlatformColor } from "react-native";

// Kept apart from `category-list-chrome` so that module has the same exports on both platforms.

export const LABEL = PlatformColor("label");

export const PARENT_NAME = font({
    design: "rounded",
    textStyle: "body",
    weight: "semibold",
});
export const CHILD_NAME = font({ design: "rounded", textStyle: "subheadline" });
