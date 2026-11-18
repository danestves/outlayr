import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function AccountsList({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ AccountsListFragment }, locale) => <AccountsListFragment fit locale={locale} theme={theme} />}
        </Replica>
    );
}
