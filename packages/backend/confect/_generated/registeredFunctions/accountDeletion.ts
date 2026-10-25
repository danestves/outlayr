import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../accountDeletion.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../accountDeletion.spec")["default"]>(databaseSchema, groupLayer);
