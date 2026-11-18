import type { AccountId } from "@/components/app-ui/accounts";

import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function AccountCardRow({ account = "acc-apple", theme = "dark" }: SlotProps & { account?: AccountId }) {
    return (
        <Replica>
            {({ DebtRowFragment }, locale) => <DebtRowFragment account={account} fit locale={locale} theme={theme} />}
        </Replica>
    );
}
