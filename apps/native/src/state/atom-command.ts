import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

export type AtomCommandResult<A, E> = AsyncResult.Success<A, E> | AsyncResult.Failure<A, E>;

export interface AtomCommandOptions {
    readonly label?: string;
    readonly reportDefect?: boolean;
    readonly reportFailure?: boolean;
}

export const SILENT = { reportDefect: false, reportFailure: false } as const satisfies AtomCommandOptions;

export interface AtomCommandReporter {
    readonly error: (message: string, detail: string) => void;
    readonly warn: (message: string, detail: string) => void;
}

export interface AtomCommand<W, A, E> {
    readonly label: string;
    readonly run: (registry: AtomRegistry.AtomRegistry, input: W) => Promise<AtomCommandResult<A, E>>;
}

export function createRuntimeCommand<R, ER, W, A, E>(
    runtime: Atom.AtomRuntime<R, ER>,
    options: {
        readonly execute: (input: W, registry: AtomRegistry.AtomRegistry) => Effect.Effect<A, E, R>;
        readonly label: string;
    }
): AtomCommand<W, A, E | ER> {
    const settle = (registry: AtomRegistry.AtomRegistry, input: W) =>
        Effect.suspend(() => {
            const atom = runtime.atom(options.execute(input, registry)).pipe(Atom.withLabel(options.label));
            return AtomRegistry.mount(registry, atom).pipe(
                Effect.andThen(AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }))
            );
        }).pipe(Effect.scoped, Effect.exit, Effect.map(AsyncResult.fromExit));
    return {
        label: options.label,
        run: (registry, input) => Effect.runPromise(settle(registry, input)),
    };
}

function reportAtomCommandResult(
    result: AtomCommandResult<unknown, unknown>,
    options: AtomCommandOptions = {},
    reporter: AtomCommandReporter = console
): void {
    if (AsyncResult.isSuccess(result) || Cause.hasInterruptsOnly(result.cause)) {
        return;
    }
    const label = options.label ?? "atom command";
    if (Cause.hasDies(result.cause)) {
        if (options.reportDefect ?? true) {
            reporter.error(`[command] ${label} defected`, Cause.pretty(result.cause));
        }
    } else if (options.reportFailure ?? true) {
        reporter.warn(`[command] ${label} failed`, Cause.pretty(result.cause));
    }
}

export async function runAtomCommand<W, A, E>(
    registry: AtomRegistry.AtomRegistry,
    command: AtomCommand<W, A, E>,
    input: W,
    options: AtomCommandOptions = {},
    reporter: AtomCommandReporter = console
): Promise<AtomCommandResult<A, E>> {
    const result = await command.run(registry, input);
    reportAtomCommandResult(result, { label: command.label, ...options }, reporter);
    return result;
}

export function unwrapAtomCommand<A, E>(result: AtomCommandResult<A, E>): A {
    if (AsyncResult.isSuccess(result)) {
        return result.value;
    }
    throw Cause.squash(result.cause);
}
