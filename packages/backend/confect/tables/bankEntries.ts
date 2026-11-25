import { Table } from "@confect/core";
import { BankTransactionStatus } from "@outlayr/banking/provider";
import * as Schema from "effect/Schema";

import { Id } from "../_generated/id";

// What the server last wrote for one bank transaction. The ledger row is the user's once edited, so each update
// compares the row with this record and leaves a field alone when the user changed it.
export default Table.make(() =>
    Schema.Struct({
        amount: Schema.Number,
        bankAccountId: Id("bankAccounts"),
        date: Schema.Number,
        key: Schema.String,
        localId: Schema.String,
        note: Schema.String,
        status: BankTransactionStatus,
        userId: Schema.String,
    })
)
    .index("by_userId", ["userId", "key"])
    .index("by_bankAccountId", ["bankAccountId"]);
