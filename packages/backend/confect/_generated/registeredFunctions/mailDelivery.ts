import { RegisteredNodeFunction } from "@confect/server/node";
import databaseSchema from "../schema";
import groupLayer from "../../mailDelivery.impl";

export default RegisteredNodeFunction.buildForGroup<typeof import("../../mailDelivery.spec")["default"]>(databaseSchema, groupLayer);
