import type { CaptureResult } from "posthog-js";

const NOISE = [
    // Benign by spec, the notifications arrive next frame. The vendored Stageshow films raise it, and that kit stays a
    // copy of upstream, so it is dropped here rather than patched there.
    /^ResizeObserver loop completed with undelivered notifications/,
    // Email link scanners open the page in headless Chrome, and their injected script calls a missing host method.
    /^(Non-Error promise rejection captured with value: )?Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+$/,
];

export function dropNoiseExceptions(event: CaptureResult | null): CaptureResult | null {
    const exceptions: unknown = event?.event === "$exception" ? event.properties.$exception_list : undefined;
    const noise =
        Array.isArray(exceptions) &&
        exceptions.length > 0 &&
        exceptions.every((exception) => {
            const value = String(exception?.value ?? "");
            return NOISE.some((pattern) => pattern.test(value));
        });
    return noise ? null : event;
}
