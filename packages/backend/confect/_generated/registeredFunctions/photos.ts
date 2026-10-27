import { RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../photos.impl";

export default RegisteredFunctions.buildForGroup<typeof import("../../photos.spec")["default"]>(databaseSchema, groupLayer);
