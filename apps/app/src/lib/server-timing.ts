import { appendResponseHeader } from "@tanstack/react-start/server";

export const serverTimingEntry = (name: string, ms: number, desc?: string) =>
    `${name};dur=${ms.toFixed(1)}${desc ? `;desc="${desc}"` : ""}`;

// Server-only: each step of a server render reports its time in the response's Server-Timing header.
export async function timed<T>(name: string, work: () => Promise<T>, describe?: (value: T) => string): Promise<T> {
    const start = performance.now();
    const value = await work();
    appendResponseHeader("server-timing", serverTimingEntry(name, performance.now() - start, describe?.(value)));
    return value;
}
