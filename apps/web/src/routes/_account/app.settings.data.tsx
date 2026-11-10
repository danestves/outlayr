import { createFileRoute } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { DataSettings } from "@/components/dashboard/settings/data/screen";
import { DATA_TABS } from "@/components/dashboard/settings/data/tabs";

export const Route = createFileRoute("/_account/app/settings/data")({
    component: DataSettings,
    validateSearch: Schema.toStandardSchemaV1(Schema.Struct({ tab: Schema.optional(Schema.Literals(DATA_TABS)) })),
});
