import { Replica } from "../replica";
import { PhoneFit } from "./phone-fit";
import type { SlotProps } from "./placeholder";

export function BudgetsPhone({ theme = "dark" }: SlotProps) {
    return (
        <PhoneFit dark={theme === "dark"}>
            <Replica>
                {({ BudgetsScreen }, locale) => <BudgetsScreen locale={locale} slot="budgets-phone" theme={theme} />}
            </Replica>
        </PhoneFit>
    );
}
