import * as Schema from "effect/Schema";

export const MoneyGoal = Schema.Literals(["track", "spendLess", "save", "payDebt"]);

export type MoneyGoal = typeof MoneyGoal.Type;
