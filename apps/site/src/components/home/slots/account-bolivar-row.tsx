import { useLocale } from "react-intlayer";

import { AccountRowFragment } from "@/components/app-ui/accounts";
import type { AccountId } from "@/components/app-ui/accounts";

import type { SlotProps } from "./placeholder";

export function AccountBolivarRow({ account = "acc-banesco", theme = "dark" }: SlotProps & { account?: AccountId }) {
    const { locale } = useLocale();
    return <AccountRowFragment account={account} fit locale={locale} theme={theme} />;
}
