import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../cotizave.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../cotizave.spec")["default"]>(databaseSchema, groupLayer);
