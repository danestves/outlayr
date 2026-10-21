import type { HostProps } from "@expo/ui/jetpack-compose";

export type MaterialHostProps = Omit<HostProps, "colorScheme" | "seedColor">;

/**
 * Throws on iOS: a jetpack-compose view there resolves to the SwiftUI `HostView`, which takes different props.
 * Import it from `.android.tsx` siblings only.
 */
export function MaterialHost(_props: MaterialHostProps): never {
    throw new Error("MaterialHost is Android-only. Render it from a .android.tsx sibling.");
}
