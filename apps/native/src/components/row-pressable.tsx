import { Pressable } from "react-native";
import type { PressableProps } from "react-native";

import { cn } from "./tw";

export type RowPressableProps = PressableProps & { className?: string };

export function RowPressable({ className, ...props }: RowPressableProps) {
    return <Pressable className={cn(className, "active:opacity-70")} {...props} />;
}
