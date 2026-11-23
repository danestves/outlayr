import CreditCardIcon from "@hugeicons-pro/core-stroke-rounded/CreditCardIcon";
import ShoppingCart01Icon from "@hugeicons-pro/core-stroke-rounded/ShoppingCart01Icon";
import UserAdd01Icon from "@hugeicons-pro/core-stroke-rounded/UserAdd01Icon";
import UserIcon from "@hugeicons-pro/core-stroke-rounded/UserIcon";
import type { IconSvgElement } from "@hugeicons/react-native";
import { useRouter } from "expo-router";

import type { ActionMenuItem } from "@/components/action-menu";
import { useCreateLiability } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";

export interface NewDebtItem extends ActionMenuItem {
    /** For Android, where a menu row draws the app's own icon rather than an SF Symbol. */
    glyph: IconSvgElement;
    icon: NonNullable<ActionMenuItem["icon"]>;
}

export function useNewDebtItems(): readonly NewDebtItem[] {
    const router = useRouter();
    const t = useTranslation();
    const createLiability = useCreateLiability();

    return [
        {
            glyph: UserAdd01Icon,
            icon: "person",
            id: "lent",
            label: t("debts.add.person"),
            onPress: () => router.push({ params: { verb: "lent" }, pathname: "/debts/new" }),
        },
        {
            glyph: UserIcon,
            icon: "hammer",
            id: "owe",
            label: t("debts.add.owe"),
            onPress: () => router.push("/debts/owe"),
        },
        {
            glyph: CreditCardIcon,
            icon: "creditcard",
            id: "liability",
            label: t("debts.add.liability"),
            onPress: createLiability,
        },
        {
            glyph: ShoppingCart01Icon,
            icon: "cart",
            id: "installments",
            label: t("accounts.add.installments"),
            onPress: () => router.push("/installments/new"),
        },
    ];
}
