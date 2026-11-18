import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function BudgetLeft({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ BudgetLeftFragment }, locale) => <BudgetLeftFragment fit locale={locale} theme={theme} />}
        </Replica>
    );
}
