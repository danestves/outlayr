import { Stack } from "expo-router";

export interface ScreenHeaderProps {
    /** Omit it to keep whatever the layout set. */
    title?: string;
    /** iOS only. */
    large?: boolean;
}

// Use it inside a screen, not as a `Stack.Screen` child in a layout: page-level header pieces apply through
// composition options, while a layout matches its children by element type.
export function ScreenHeader({ title, large }: ScreenHeaderProps) {
    return (
        <>
            <Stack.Header transparent />
            {title === undefined ? null : <Stack.Screen.Title large={large}>{title}</Stack.Screen.Title>}
        </>
    );
}
