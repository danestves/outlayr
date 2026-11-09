import { createFileRoute } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { DATA_TABS, DataSettings } from "@/components/dashboard/settings/data/screen";

export const Route = createFileRoute("/_account/app/settings/data")({
    component: DataSettings,
    validateSearch: Schema.toStandardSchemaV1(Schema.Struct({ tab: Schema.optional(Schema.Literals(DATA_TABS)) })),
});
