import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

/** The account screens' icon weight, the same as the tiles beside them. */
export function Glyph(props: ComponentProps<typeof HugeiconsIcon>) {
    return <HugeiconsIcon strokeWidth={2} {...props} />;
}
