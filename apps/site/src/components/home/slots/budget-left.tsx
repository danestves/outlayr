import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function BudgetLeft({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="budget-left" ratio="440 / 100" theme={theme} />;
}
