import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

export const PaywallTrigger = Schema.Literals([
    "accounts",
    "app_icon",
    "budgets",
    "captures",
    "currencies",
    "import",
    "installment_apps",
    "payoff_plans",
    "people",
    "settings",
    "sync",
    "unknown",
    "usage",
]);

const readTrigger = Schema.decodeUnknownOption(PaywallTrigger);

export function paywallTriggerOf(param: string | string[] | undefined): typeof PaywallTrigger.Type {
    return Option.getOrElse(readTrigger(param), () => "unknown");
}

export function paywallHref(trigger: typeof PaywallTrigger.Type) {
    return { params: { trigger }, pathname: "/paywall" } as const;
}
