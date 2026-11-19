import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function AccountForeignRow({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ AccountRowFragment }, locale) => (
                <AccountRowFragment account="acc-foreign" fit locale={locale} theme={theme} />
            )}
        </Replica>
    );
}
