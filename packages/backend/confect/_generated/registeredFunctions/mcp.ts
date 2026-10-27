import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../mcp.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../mcp.spec")["default"]>(databaseSchema, groupLayer);
