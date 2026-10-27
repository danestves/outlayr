import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../receiptScan.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../receiptScan.spec")["default"]>(databaseSchema, groupLayer);
