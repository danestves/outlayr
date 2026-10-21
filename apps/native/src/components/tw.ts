import { extendTailwindMerge } from "tailwind-merge";
import { createTV } from "tailwind-variants";

// tailwind-merge files every unknown `--text-*` token as a colour, so `cn("text-body", "text-danger")` would drop
// the size. Declaring the sizes keeps them apart; colours fall through to `text-color` already.
const twMergeConfig = {
    extend: {
        classGroups: {
            "font-size": [
                {
                    text: [
                        "micro",
                        "eyebrow",
                        "label",
                        "footnote",
                        "caption",
                        "subtitle",
                        "body",
                        "callout",
                        "headline",
                        "title",
                        "hero",
                    ],
                },
            ],
            tracking: [{ tracking: ["eyebrow", "label", "hero"] }],
        },
    },
} as const;

// Not `tailwind-variants`' `cnMerge`: it accepts `twMergeConfig` and silently ignores it (`text-title` still drops).
const merge = extendTailwindMerge(twMergeConfig);

export function cn(...classes: (string | false | null | undefined)[]): string | undefined {
    const joined = classes.filter(Boolean).join(" ");
    return joined === "" ? undefined : merge(joined);
}

export const tv = createTV({ twMergeConfig });
