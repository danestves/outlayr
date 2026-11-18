import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function BudgetScreen({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ BudgetsScreen }, locale) => <BudgetsScreen fit locale={locale} slot="budget-screen" theme={theme} />}
        </Replica>
    );
}
