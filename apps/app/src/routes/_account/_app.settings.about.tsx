import { createFileRoute } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { AboutSettings } from "@/components/dashboard/settings/about/screen";
import { ABOUT_TABS } from "@/components/dashboard/settings/about/tabs";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/about")({
    head: pageHead("settingsAbout"),
    component: AboutSettings,
    validateSearch: Schema.toStandardSchemaV1(Schema.Struct({ tab: Schema.optional(Schema.Literals(ABOUT_TABS)) })),
});
