import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../enrichmentQueue.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../enrichmentQueue.spec")["default"]>(databaseSchema, groupLayer);
