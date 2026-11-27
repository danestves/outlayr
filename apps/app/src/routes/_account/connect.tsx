import { createFileRoute, redirect } from "@tanstack/react-router";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

import { ConnectFlow } from "@/components/account/connect-flow";
import { pageHead } from "@/lib/route-title";

const RequestId = Schema.Union([Schema.String, Schema.Finite]).pipe(
    Schema.decodeTo(
        Schema.String,
        SchemaTransformation.transform<string, string | number>({ decode: String, encode: (id) => id })
    )
);

export const Route = createFileRoute("/_account/connect")({
    beforeLoad: ({ context, location }) => {
        if (!context.token) {
            throw redirect({ search: { redirect: location.href }, to: "/login" });
        }
    },
    component: Connect,
    head: pageHead("connect"),
    validateSearch: Schema.toStandardSchemaV1(Schema.Struct({ request: Schema.optional(RequestId) })),
});

function Connect() {
    return <ConnectFlow requestId={Route.useSearch().request} />;
}
