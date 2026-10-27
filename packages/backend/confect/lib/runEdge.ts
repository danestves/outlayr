import * as ConvexConfigProvider from "@confect/server/ConvexConfigProvider";
import * as ConvexLogger from "@confect/server/ConvexLogger";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as References from "effect/References";
import * as Scheduler from "effect/Scheduler";

const edgeLayer = Layer.merge(ConvexConfigProvider.layer, ConvexLogger.layer);

export const runEdge = <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
    Effect.runPromise(Effect.provide(effect, edgeLayer));

export const runTransactionEdge = <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
    Effect.runPromise(
        effect.pipe(Effect.provide(edgeLayer), Effect.provideService(References.TracerTimingEnabled, false)),
        { scheduler: new Scheduler.MixedScheduler("sync") }
    );

export const runEdgeSync = <A, E>(effect: Effect.Effect<A, E>): A => Effect.runSync(Effect.provide(effect, edgeLayer));
