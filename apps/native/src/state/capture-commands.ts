import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { fetchMerchantImage } from "@/lib/logo-fetch";
import type { LogoOutcome, MerchantImageRequest } from "@/lib/logo-fetch";
import { appRuntime } from "@/lib/runtime";

import { createCommand, createRuntimeCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

const CaptureOperation = Schema.Literals(["enrich", "scan", "speak"]);

export class CaptureCallError extends Schema.TaggedError<CaptureCallError>()("CaptureCallError", {
    cause: Schema.Defect(),
    operation: CaptureOperation,
}) {
    override get message() {
        return `The ${this.operation} request failed`;
    }
}

export const ENRICHMENT_TIMEOUT = Duration.seconds(9);
export const RECEIPT_SCAN_TIMEOUT = Duration.seconds(30);
export const VOICE_SPEAK_TIMEOUT = Duration.seconds(25);

const dismissedBy = (signal: AbortSignal) =>
    Effect.callback<never>((resume) => {
        if (signal.aborted) {
            resume(Effect.interrupt);
            return;
        }
        const onAbort = () => resume(Effect.interrupt);
        signal.addEventListener("abort", onAbort, { once: true });
        return Effect.sync(() => signal.removeEventListener("abort", onAbort));
    });

export const timedCaptureCommand = <A>(options: {
    readonly operation: typeof CaptureOperation.Type;
    readonly timeout: Duration.Duration;
}) =>
    createCommand({
        execute: (input: { call: Effect.Effect<A, unknown>; signal: AbortSignal }) =>
            input.call.pipe(
                Effect.mapError((cause) => new CaptureCallError({ cause, operation: options.operation })),
                Effect.timeoutOption(options.timeout),
                Effect.raceFirst(dismissedBy(input.signal))
            ),
        label: `capture:${options.operation}`,
    });

export const fetchMerchantLogoCommand = createRuntimeCommand(appRuntime, {
    execute: (request: MerchantImageRequest) => fetchMerchantImage(request),
    label: "capture:fetch-merchant-logo",
});

export async function fetchMerchantLogo(request: MerchantImageRequest): Promise<LogoOutcome> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, fetchMerchantLogoCommand, request, SILENT));
}
