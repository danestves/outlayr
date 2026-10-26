import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";

import { createCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";

type FetchArgs = Parameters<typeof fetch>;

const TOKEN_PATH = "/convex/token";
const RETRY_DELAYS = [Duration.seconds(1), Duration.seconds(2), Duration.seconds(5), Duration.seconds(10)] as const;

export class TokenFetchError extends Schema.TaggedError<TokenFetchError>()("TokenFetchError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- the fixed sentence is what a log of a failed token fetch reads
    override get message(): string {
        return "Convex token request failed";
    }
}

const retryAfter = (delays: readonly Duration.Input[]) =>
    Schedule.spaced(Duration.zero).pipe(
        Schedule.modifyDelay(({ attempt }) => Effect.succeed(delays[Math.min(attempt, delays.length) - 1] ?? 0))
    );

export function retryTokenFetch<Res>(
    fetchImpl: (...args: FetchArgs) => Promise<Res>,
    delays: readonly Duration.Input[] = RETRY_DELAYS
) {
    const schedule = retryAfter(delays);
    const tokenRequest = createCommand({
        execute: Effect.fn("TokenFetch.request")(function* request(args: FetchArgs) {
            return yield* Effect.tryPromise({
                catch: (cause) => new TokenFetchError({ cause }),
                try: () => fetchImpl(...args),
            }).pipe(Effect.retry({ schedule, while: () => !args[1]?.signal?.aborted }));
        }),
        label: "cloud:token-fetch",
    });
    return async (...args: FetchArgs): Promise<Res> => {
        if (!String(args[0]).endsWith(TOKEN_PATH)) {
            return await fetchImpl(...args);
        }
        try {
            return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, tokenRequest, args, SILENT));
        } catch (error) {
            throw error instanceof TokenFetchError ? error.cause : error;
        }
    };
}
