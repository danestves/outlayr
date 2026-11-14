import { createFileRoute } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { Onboarding } from "@/components/dashboard/onboarding/flow";

export const Route = createFileRoute("/_account/_app/onboarding")({
    component: OnboardingPage,
    validateSearch: Schema.toStandardSchemaV1(Schema.Struct({ step: Schema.optional(Schema.String) })),
});

function OnboardingPage() {
    const { step } = Route.useSearch();
    return <Onboarding step={step} />;
}
