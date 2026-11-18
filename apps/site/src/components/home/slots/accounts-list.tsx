import { useLocale } from "react-intlayer";

import { AccountsListFragment } from "@/components/app-ui/accounts";

import type { SlotProps } from "./placeholder";

export function AccountsList({ theme = "dark" }: SlotProps) {
    const { locale } = useLocale();
    return <AccountsListFragment fit locale={locale} theme={theme} />;
}
