import * as Effect from "effect/Effect";

import { CloudError } from "./cloud-error";

export const asCloudCall =
    <Args extends unknown[], A>(run: (...args: Args) => PromiseLike<A>) =>
    (...args: Args) =>
        Effect.tryPromise({
            catch: (cause) => new CloudError({ cause, kind: "query", path: "fake" }),
            try: () => run(...args),
        });
