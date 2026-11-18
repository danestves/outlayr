import type { AccountId } from "@/components/app-ui/accounts";

import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function AppearanceRow({ account = "acc-banesco", theme = "dark" }: SlotProps & { account?: AccountId }) {
    return (
        <Replica>
            {({ AccountRowFragment }, locale) => (
                <AccountRowFragment account={account} className="rounded-[14px]" fit locale={locale} theme={theme} />
            )}
        </Replica>
    );
}
