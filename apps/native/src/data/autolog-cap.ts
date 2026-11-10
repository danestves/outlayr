import type { Database } from "@/db/client";
import { monthUsage } from "@/domain/autolog-cap";
import { FREE_AUTOLOG_PER_MONTH } from "@/domain/pro-limits";

import { useMeta } from "./app-meta";
import { useNow } from "./use-now";

export function useAutologUsage(db: Database) {
    const usage = useMeta(db, "autologUsage");
    const queued = useMeta(db, "autologWaiting");
    return {
        cap: FREE_AUTOLOG_PER_MONTH,
        queued,
        used: monthUsage(usage, useNow()).used,
        waiting: queued.length,
    };
}
