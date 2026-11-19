import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function AppearanceRow({ theme = "dark" }: SlotProps) {
    return (
        <Replica>
            {({ AccountRowFragment }, locale) => (
                <AccountRowFragment
                    account="acc-foreign"
                    className="rounded-[14px]"
                    fit
                    locale={locale}
                    theme={theme}
                />
            )}
        </Replica>
    );
}
