type FetchArgs = Parameters<typeof fetch>;

const TOKEN_PATH = "/convex/token";
const RETRY_DELAYS_MS = [1000, 2000, 5000, 10_000] as const;

export function retryTokenFetch<Res>(
    fetchImpl: (...args: FetchArgs) => Promise<Res>,
    delaysMs: readonly number[] = RETRY_DELAYS_MS
) {
    const attempt = async (args: FetchArgs, failures: number): Promise<Res> => {
        try {
            return await fetchImpl(...args);
        } catch (error) {
            if (args[1]?.signal?.aborted) {
                throw error;
            }
            await new Promise((resolve) => {
                setTimeout(resolve, delaysMs[Math.min(failures, delaysMs.length - 1)]);
            });
            return await attempt(args, failures + 1);
        }
    };
    return async (...args: FetchArgs): Promise<Res> =>
        String(args[0]).endsWith(TOKEN_PATH) ? await attempt(args, 0) : await fetchImpl(...args);
}
