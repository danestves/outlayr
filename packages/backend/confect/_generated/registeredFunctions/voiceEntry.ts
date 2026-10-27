import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../voiceEntry.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../voiceEntry.spec")["default"]>(databaseSchema, groupLayer);
