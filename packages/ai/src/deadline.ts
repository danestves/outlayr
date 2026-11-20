import * as Duration from "effect/Duration";

export const deadline = (interrupt: AbortSignal, timeout: Duration.Input) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Duration.toMillis(Duration.fromInputUnsafe(timeout)));
    interrupt.addEventListener("abort", () => controller.abort(), { once: true });
    return { controller, release: () => clearTimeout(timer) };
};
