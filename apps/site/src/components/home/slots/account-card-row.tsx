import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function AccountCardRow({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ DebtRowFragment }, locale) => (
                <DebtRowFragment account="acc-credit" fit locale={locale} theme={theme} />
            )}
        </Replica>
    );
}
