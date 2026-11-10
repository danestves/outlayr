import { useWalletState } from "@/data/use-wallet-state";
import type { Database } from "@/db/client";

export function useIntegrationsOn(db: Database): number {
    const { applePayOn, lastNotification } = useWalletState(db);
    return Number(applePayOn) + Number(lastNotification != null);
}
