import { useLocale } from "react-intlayer";

import { AccountRowFragment } from "@/components/app-ui/accounts";
import type { AccountId } from "@/components/app-ui/accounts";

import type { SlotProps } from "./placeholder";

export function AppearanceRow({ account = "acc-banesco", theme = "dark" }: SlotProps & { account?: AccountId }) {
    const { locale } = useLocale();
    return <AccountRowFragment account={account} className="rounded-[14px]" fit locale={locale} theme={theme} />;
}
