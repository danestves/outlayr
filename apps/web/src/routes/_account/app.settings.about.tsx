import { createFileRoute } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { ABOUT_TABS, AboutSettings } from "@/components/dashboard/settings/about/screen";

export const Route = createFileRoute("/_account/app/settings/about")({
    component: AboutSettings,
    validateSearch: Schema.toStandardSchemaV1(Schema.Struct({ tab: Schema.optional(Schema.Literals(ABOUT_TABS)) })),
});
