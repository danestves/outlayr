import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../sync.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../sync.spec")["default"]>(databaseSchema, groupLayer);
