/**
 * `work`, or `sentinel` once `ms` has passed, clearing the timer either way so a won race leaves no pending task.
 * The sentinel is returned rather than thrown because callers branch on a timeout as an outcome.
 */
export async function withTimeout<Result, Sentinel>(
    work: Promise<Result>,
    ms: number,
    sentinel: Sentinel
): Promise<Result | Sentinel> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            work,
            new Promise<Sentinel>((resolve) => {
                timer = setTimeout(() => resolve(sentinel), ms);
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
}
