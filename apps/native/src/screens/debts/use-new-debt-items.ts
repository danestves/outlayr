import { useRouter } from "expo-router";

import type { ActionMenuItem } from "@/components/action-menu";
import { useCreateLiability } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";

export function useNewDebtItems(): readonly ActionMenuItem[] {
    const router = useRouter();
    const t = useTranslation();
    const createLiability = useCreateLiability();

    return [
        {
            icon: "person",
            id: "lent",
            label: t("debts.add.person"),
            onPress: () => router.push({ params: { verb: "lent" }, pathname: "/debts/new" }),
        },
        { icon: "hammer", id: "owe", label: t("debts.add.owe"), onPress: () => router.push("/debts/owe") },
        { icon: "creditcard", id: "liability", label: t("debts.add.liability"), onPress: createLiability },
        {
            icon: "cart",
            id: "installments",
            label: t("accounts.add.installments"),
            onPress: () => router.push({ params: { installments: "1" }, pathname: "/transactions/create" }),
        },
    ];
}
