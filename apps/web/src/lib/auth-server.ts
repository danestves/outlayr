import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

import { convexUrls } from "./convex";

let server: ReturnType<typeof convexBetterAuthReactStart> | undefined;

export function authServer() {
    server ??= convexBetterAuthReactStart({
        ...convexUrls(),
        // The session's JWT cookie is enough to render the shell, so a reload never waits on Convex for it.
        jwtCache: { enabled: true, isAuthError: () => false },
    });
    return server;
}
