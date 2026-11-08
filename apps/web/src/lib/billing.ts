import type { ProPlan } from "@outlayr/money/pro-prices";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { convexUrls } from "./convex";

export const CHECKOUT_CONFIRMED = "confirmed";
export const HELD_STATES: ReadonlySet<string> = new Set(["renews", "trial", "ends", "lifetime"]);

const decodeAnswer = Schema.decodeUnknownOption(
    Schema.Union([
        Schema.Struct({ kind: Schema.Literal("redirect"), url: Schema.String }),
        Schema.Struct({ kind: Schema.Literals(["alreadyPro", "signedOut", "unavailable"]) }),
    ])
);

export async function startCheckout(plan: ProPlan, token: string | null) {
    const response = await fetch(`${convexUrls().convexSiteUrl}/billing/checkout`, {
        body: JSON.stringify({ plan }),
        headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        method: "POST",
    });
    return Option.getOrElse(decodeAnswer(await response.json()), () => ({ kind: "unavailable" as const }));
}
