import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export type CaptureWay = "say" | "snap" | "type";

export function CaptureFilm({ label, theme = "light", way }: SlotProps & { way: CaptureWay }) {
    return <SlotPlaceholder fill label={label} name={`capture-film: ${way}`} theme={theme} />;
}
