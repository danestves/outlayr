import { ConvexError } from "convex/values";
import * as Effect from "effect/Effect";

export const dieAsConvexError = (error: { readonly message: string }) => Effect.die(new ConvexError(error.message));
