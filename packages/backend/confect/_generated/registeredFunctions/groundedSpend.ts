import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../groundedSpend.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../groundedSpend.spec")["default"]>(databaseSchema, groupLayer);
