import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../mcpLedger.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../mcpLedger.spec")["default"]>(databaseSchema, groupLayer);
