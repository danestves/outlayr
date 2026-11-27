import { createFileRoute } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { DataSettings } from "@/components/dashboard/settings/data/screen";
import { DATA_TABS } from "@/components/dashboard/settings/data/tabs";
import { pageHead } from "@/lib/route-title";

export const Route = createFileRoute("/_account/_app/settings/data")({
    head: pageHead("settingsData"),
    component: DataSettings,
    validateSearch: Schema.toStandardSchemaV1(Schema.Struct({ tab: Schema.optional(Schema.Literals(DATA_TABS)) })),
});
