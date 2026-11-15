import ArrowDataTransferHorizontalIcon from "@hugeicons-pro/core-stroke-rounded/ArrowDataTransferHorizontalIcon";
import BankIcon from "@hugeicons-pro/core-stroke-rounded/BankIcon";
import Mic01Icon from "@hugeicons-pro/core-stroke-rounded/Mic01Icon";
import ReceiptDollarIcon from "@hugeicons-pro/core-stroke-rounded/ReceiptDollarIcon";
import ScanIcon from "@hugeicons-pro/core-stroke-rounded/ScanIcon";
import Wallet01Icon from "@hugeicons-pro/core-stroke-rounded/Wallet01Icon";
import type { IconSvgElement } from "@hugeicons/react-native";
import { installmentAppsIn, installmentRegion } from "@outlayr/money/institution-map";
import { useRouter } from "expo-router";

import type { ActionMenuItem } from "@/components/action-menu";
import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts } from "@/data/accounts";
import { useCreateAccount } from "@/hooks/use-pro-gate";
import { useRegionCode } from "@/hooks/use-region-code";
import { useTranslation } from "@/i18n/context";
import { useNewDebtItems } from "@/screens/debts/use-new-debt-items";

type MenuSymbol = NonNullable<ActionMenuItem["icon"]>;

export interface AddMenuRow {
    description?: string;
    glyph: IconSvgElement;
    icon: MenuSymbol;
    id: string;
    label: string;
    onPress: () => void;
}

export interface AddMenuGroup {
    description: string;
    glyph: IconSvgElement;
    label: string;
    icon: MenuSymbol;
    rows: readonly AddMenuRow[];
}

export interface LogAddMenu {
    /** Nearest the + first: the menu is read from the button outward. */
    rows: readonly AddMenuRow[];
    /** The farthest row, opening a submenu. */
    more: AddMenuGroup;
}

const NAMED_APPS = 3;

export function useLogAddMenu(): LogAddMenu {
    const router = useRouter();
    const t = useTranslation();
    const createAccount = useCreateAccount();
    const canTransfer = useBankAccounts(useDatabase()).length >= 2;
    const debtItems = useNewDebtItems();
    const apps = installmentAppsIn(installmentRegion(useRegionCode()))
        .slice(0, NAMED_APPS)
        .map((app) => app.label);

    const debtRow = (id: string) => debtItems.find((item) => item.id === id);
    const installments = debtRow("installments");
    const people = ["liability", "lent", "owe"].flatMap((id) => debtRow(id) ?? []);

    const rows: AddMenuRow[] = [
        {
            glyph: ReceiptDollarIcon,
            id: "transaction",
            label: t("log.add.transaction"),
            onPress: () => router.push("/transactions/create"),
            icon: "square.and.pencil",
        },
        ...(installments
            ? [
                  {
                      ...installments,
                      description:
                          apps.length > 0
                              ? t("log.add.installmentsApps", { apps: apps.join(", ") })
                              : t("log.add.installmentsAny"),
                  },
              ]
            : []),
        {
            glyph: ScanIcon,
            id: "scan",
            label: t("log.add.scan"),
            onPress: () => router.push("/transactions/scan"),
            icon: "doc.text.viewfinder",
        },
        {
            glyph: Mic01Icon,
            id: "voice",
            label: t("log.add.voice"),
            onPress: () => router.push("/transactions/voice"),
            icon: "mic",
        },
        ...(canTransfer
            ? [
                  {
                      description: t("log.add.transferHint"),
                      glyph: ArrowDataTransferHorizontalIcon,
                      id: "transfer",
                      label: t("log.add.transfer"),
                      onPress: () => router.push("/transactions/transfers/create"),
                      icon: "arrow.left.arrow.right" as const,
                  },
              ]
            : []),
    ];

    return {
        more: {
            description: t("log.add.moreHint"),
            glyph: Wallet01Icon,
            label: t("log.add.more"),
            rows: [
                {
                    glyph: BankIcon,
                    id: "account",
                    label: t("log.add.account"),
                    onPress: createAccount,
                    icon: "building.columns",
                },
                ...people,
            ],
            icon: "wallet.bifold",
        },
        rows,
    };
}
