import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../exchangeRates.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../exchangeRates.spec")["default"]>(databaseSchema, groupLayer);
