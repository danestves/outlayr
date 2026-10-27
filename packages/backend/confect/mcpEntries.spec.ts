import { FunctionSpec, GroupSpec } from "@confect/core";

import { LogEntryInput, LoggedEntry } from "./mcpEntries";
import { McpUser } from "./mcpLedger";

export default GroupSpec.make().addFunction(
    FunctionSpec.internalMutation({
        name: "logEntry",
        args: () => ({ ...LogEntryInput, user: McpUser }),
        returns: () => LoggedEntry,
    })
);
