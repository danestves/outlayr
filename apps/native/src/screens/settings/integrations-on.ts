import { useWalletMeta } from "@/data/use-wallet-meta";
import type { Database } from "@/db/client";

export function useIntegrationsOn(db: Database): number {
    const { applePayOn, lastNotification } = useWalletMeta(db);
    return Number(applePayOn) + Number(lastNotification != null);
}
