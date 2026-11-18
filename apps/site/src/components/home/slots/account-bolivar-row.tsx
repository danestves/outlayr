import type { AccountId } from "@/components/app-ui/accounts";

import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function AccountBolivarRow({ account = "acc-banesco", theme = "dark" }: SlotProps & { account?: AccountId }) {
    return (
        <Replica>
            {({ AccountRowFragment }, locale) => (
                <AccountRowFragment account={account} fit locale={locale} theme={theme} />
            )}
        </Replica>
    );
}
