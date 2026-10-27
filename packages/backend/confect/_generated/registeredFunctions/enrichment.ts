import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../enrichment.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../enrichment.spec")["default"]>(databaseSchema, groupLayer);
