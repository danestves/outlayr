import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../groundedLookup.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../groundedLookup.spec")["default"]>(databaseSchema, groupLayer);
