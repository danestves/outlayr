import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

const Figures = {
    average: Schema.Number,
    /** The last column against the row's average, as a ratio. */
    change: Schema.NullOr(Schema.Number),
    total: Schema.Number,
    values: Schema.Array(Schema.Number),
};

/** A copy of one report as its owner saw it. With `unit` "percent" every figure is a share of the report's total. */
export const SharedReport = Schema.Struct({
    columns: Schema.Array(Schema.Struct({ from: Schema.String, key: Schema.String, to: Schema.String })),
    currency: Schema.String,
    grouping: Schema.Literals(["week", "month", "quarter", "year", "none"]),
    measure: Schema.Literals(["spending", "income", "net", "count", "average"]),
    name: Schema.String,
    rise: Schema.NullOr(
        Schema.Struct({ color: Schema.NullOr(Schema.String), delta: Schema.Number, name: Schema.String })
    ),
    rows: Schema.Array(Schema.Struct({ ...Figures, color: Schema.NullOr(Schema.String), name: Schema.String })),
    rowsBy: Schema.Literals(["category", "subcategory", "merchant", "tag", "account"]),
    totals: Schema.Struct(Figures),
    unit: Schema.Literals(["amount", "percent"]),
});

export type SharedReport = typeof SharedReport.Type;

export const Expires = Schema.Literals(["keep", "week", "month", "never"]);

const Link = Schema.Struct({ expiresAt: Schema.NullOr(Schema.Number), slug: Schema.String });

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicQuery({
            name: "mine",
            args: () => ({}),
            returns: () =>
                Schema.Array(
                    Schema.Struct({
                        expiresAt: Schema.NullOr(Schema.Number),
                        reportId: Schema.String,
                        slug: Schema.String,
                        unit: SharedReport.fields.unit,
                    })
                ),
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "publish",
            args: () => ({ expires: Expires, report: SharedReport, reportId: Schema.String }),
            returns: () => Link,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "remove",
            args: () => ({ reportId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "view",
            args: () => ({ slug: Schema.String }),
            returns: () => Schema.NullOr(Schema.Struct({ report: SharedReport, updatedAt: Schema.Number })),
        })
    )
    .addFunction(FunctionSpec.internalMutation({ name: "dropExpired", args: () => ({}), returns: () => Schema.Null }));
