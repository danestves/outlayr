import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../mcpEntries.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../mcpEntries.spec")["default"]>(databaseSchema, groupLayer);
