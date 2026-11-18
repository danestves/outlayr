import { SlotPlaceholder } from "./placeholder";
import type { SlotProps } from "./placeholder";

export function BudgetScreen({ label, theme = "dark" }: SlotProps) {
    return <SlotPlaceholder label={label} name="budget-screen" ratio="440 / 956" theme={theme} />;
}
