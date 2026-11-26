import { ONBOARDING_ANALYTICS_AT_MS } from "@outlayr/backend/confect/legal";

import type { MoneyGoal } from "@/domain/money-goal";
import { posthog } from "@/lib/posthog";

interface OnboardingEvents {
    onboarding_budget: { outcome: "kept" | "skipped" };
    onboarding_completed: { via: "flow" | "existingAccount" };
    onboarding_goal_chosen: { goal: typeof MoneyGoal.Type };
}

const disclosed = () => Date.now() >= ONBOARDING_ANALYTICS_AT_MS;

export function trackOnboarding<Event extends keyof OnboardingEvents>(
    event: Event,
    properties: OnboardingEvents[Event]
): void {
    if (disclosed()) {
        posthog?.capture(event, properties);
    }
}

export function trackMoneyGoal(goal: typeof MoneyGoal.Type): void {
    if (disclosed()) {
        posthog?.setPersonProperties({ money_goal: goal });
    }
}
