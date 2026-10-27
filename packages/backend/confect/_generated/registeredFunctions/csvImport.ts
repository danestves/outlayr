import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../csvImport.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../csvImport.spec")["default"]>(databaseSchema, groupLayer);
