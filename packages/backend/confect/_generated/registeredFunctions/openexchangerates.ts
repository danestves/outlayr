import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../openexchangerates.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../openexchangerates.spec")["default"]>(databaseSchema, groupLayer);
