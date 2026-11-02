import { useFocusEffect, useRouter } from "expo-router";

import { BALANCES_ACCOUNTS } from "@/domain/balances";

// `navigate`, not `<Redirect>`: its `replace` would stack a second tab navigator over the one this screen covers.
export default function AccountsScreen() {
    const router = useRouter();
    useFocusEffect(() => {
        router.navigate(BALANCES_ACCOUNTS);
    });
    return null;
}
