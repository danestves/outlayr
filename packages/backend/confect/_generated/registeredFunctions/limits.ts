import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../limits.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../limits.spec")["default"]>(databaseSchema, groupLayer);
