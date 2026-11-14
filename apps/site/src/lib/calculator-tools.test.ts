import * as Schema from "effect/Schema";
import * as SchemaRepresentation from "effect/SchemaRepresentation";
import { expect, it } from "vite-plus/test";

import { CALCULATOR_SPECS } from "./calculator-specs";
import { CALCULATORS, runCalculator } from "./calculator-tools";

it.each(CALCULATOR_SPECS)("$name advertises the schema it decodes with", ({ inputSchema, name }) => {
    const { schema } = SchemaRepresentation.toJsonSchemaDocument(Schema.toRepresentation(CALCULATORS[name].input));
    expect(inputSchema).toEqual(schema);
});

it("tells the agent why the input was rejected", () => {
    const result = runCalculator("split_expenses", {
        people: [
            { name: "Ana", paid: 10 },
            { name: "ana", paid: 5 },
        ],
    });
    expect(result).toEqual({ error: expect.stringContaining("Each person needs a different name") });
});

it("adds the upfront fee to what a loan costs", () => {
    expect(
        runCalculator("loan_cost", { amount: 1200.5, annualRatePercent: 0, months: 12, upfrontFeePercent: 2 })
    ).toMatchObject({ interest: 0, monthlyPayment: 100.04, totalPaid: 1224.51, upfrontFee: 24.01 });
});
