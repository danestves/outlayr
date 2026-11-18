import { useLocale } from "react-intlayer";

import { DebtRowFragment } from "@/components/app-ui/accounts";
import type { AccountId } from "@/components/app-ui/accounts";

import type { SlotProps } from "./placeholder";

export function AccountCardRow({ account = "acc-apple", theme = "dark" }: SlotProps & { account?: AccountId }) {
    const { locale } = useLocale();
    return <DebtRowFragment account={account} fit locale={locale} theme={theme} />;
}
