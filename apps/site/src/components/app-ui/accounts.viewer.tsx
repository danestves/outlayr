import { AccountRowFragment, AccountsListFragment, AccountsScreen, DebtRowFragment } from "./accounts";
import type { CanvasProps } from "./canvas";

export const screens = {
    accounts: AccountsScreen,
    "accounts-card-row": (props: CanvasProps) => <DebtRowFragment {...props} account="acc-credit" />,
    "accounts-foreign-row": (props: CanvasProps) => <AccountRowFragment {...props} account="acc-foreign" />,
    "accounts-list": AccountsListFragment,
};
