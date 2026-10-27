import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

import { convexUrls } from "./convex";

let server: ReturnType<typeof convexBetterAuthReactStart> | undefined;

export function authServer() {
    server ??= convexBetterAuthReactStart(convexUrls());
    return server;
}
