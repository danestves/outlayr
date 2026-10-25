import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import {
    authorize,
    createApiKey,
    createApiKeyForUser,
    findAuthRequest,
    getAuthRequest,
    listConnections,
    revokeConnection,
} from "./mcp";
import spec from "./mcp.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "authorize", authorize)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "createApiKey", createApiKey)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "createApiKeyForUser", createApiKeyForUser)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "findAuthRequest", findAuthRequest)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "getAuthRequest", getAuthRequest)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "listConnections", listConnections)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "revokeConnection", revokeConnection)),
    GroupImpl.finalize
);
