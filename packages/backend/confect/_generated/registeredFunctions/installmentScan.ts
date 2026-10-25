import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../installmentScan.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../installmentScan.spec")["default"]>(databaseSchema, groupLayer);
