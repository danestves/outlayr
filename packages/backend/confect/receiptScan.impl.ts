import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { admit, scan } from "./receiptScan";
import spec from "./receiptScan.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "admit", admit)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "scan", scan)),
    GroupImpl.finalize
);
