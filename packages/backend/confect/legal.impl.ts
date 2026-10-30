import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import { POLICY_NOTICES } from "./legal";
import spec from "./legal.spec";

const notices = FunctionImpl.make(databaseSchema, spec, "notices", () => Effect.succeed(POLICY_NOTICES));

export default GroupImpl.make(databaseSchema, spec).pipe(Layer.provide(notices), GroupImpl.finalize);
