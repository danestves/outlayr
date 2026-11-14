import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

export function Glyph(props: ComponentProps<typeof HugeiconsIcon>) {
    return <HugeiconsIcon strokeWidth={1.5} {...props} />;
}
