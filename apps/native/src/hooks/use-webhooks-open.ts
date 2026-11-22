import { useState } from "react";

import { useNow } from "@/data/use-now";
import { webhooksOpen } from "@/lib/webhook-settings";

// The shared clock can trail the wall clock at mount, and a closed gate would redirect away before it catches up.
export function useWebhooksOpen(): boolean {
    const clock = useNow();
    const [mountedAt] = useState(Date.now);
    return webhooksOpen(Math.max(clock, mountedAt));
}
