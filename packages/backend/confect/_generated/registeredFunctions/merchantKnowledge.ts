import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../merchantKnowledge.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../merchantKnowledge.spec")["default"]>(databaseSchema, groupLayer);
