import { usePurchaseListener } from "@/lib/use-purchase-listener";

import type { useIntegrationsOn as useIosIntegrationsOn } from "./integrations-on";

export const useIntegrationsOn: typeof useIosIntegrationsOn = () => {
    const [listener] = usePurchaseListener();
    return Number(listener.enabled && listener.allowed.size > 0);
};
