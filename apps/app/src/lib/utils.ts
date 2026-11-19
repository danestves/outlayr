import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const isAppToken = (value: string) => value.startsWith("app-");

// tailwind-merge only knows Tailwind's default scales: unregistered, text-app-label
// reads as a colour and drops text-muted-foreground.
const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            ease: [isAppToken],
            radius: [isAppToken],
            spacing: [isAppToken],
            text: ["app-micro", "app-caption", "app-label", "app-body", "app-title", "app-heading", "app-figure"],
        },
    },
});

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
