import type { api } from "@outlayr/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export { formatWait, projectLimit } from "@outlayr/money/limit-projection";
export type { LimitProjection } from "@outlayr/money/limit-projection";

export type UsageLimits = NonNullable<FunctionReturnType<typeof api.limits.mine>>;

export type LimitBucket = UsageLimits["captures"];
