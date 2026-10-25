import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../revenuecat.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../revenuecat.spec")["default"]>(databaseSchema, groupLayer);
