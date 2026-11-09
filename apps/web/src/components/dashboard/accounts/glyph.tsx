import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

export function Glyph(props: ComponentProps<typeof HugeiconsIcon>) {
    return <HugeiconsIcon strokeWidth={2} {...props} />;
}
