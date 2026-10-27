import { FunctionSpec, GroupSpec } from "@confect/core";

import type {
    authorize,
    createApiKey,
    createApiKeyForUser,
    findAuthRequest,
    getAuthRequest,
    listConnections,
    revokeConnection,
} from "./mcp";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexPublicAction<typeof authorize>()("authorize"))
    .addFunction(FunctionSpec.convexPublicAction<typeof createApiKey>()("createApiKey"))
    .addFunction(FunctionSpec.convexInternalAction<typeof createApiKeyForUser>()("createApiKeyForUser"))
    .addFunction(FunctionSpec.convexPublicMutation<typeof findAuthRequest>()("findAuthRequest"))
    .addFunction(FunctionSpec.convexPublicQuery<typeof getAuthRequest>()("getAuthRequest"))
    .addFunction(FunctionSpec.convexPublicQuery<typeof listConnections>()("listConnections"))
    .addFunction(FunctionSpec.convexPublicMutation<typeof revokeConnection>()("revokeConnection"));
