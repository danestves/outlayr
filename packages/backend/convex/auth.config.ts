import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
    // Without a static JWKS, Convex fetches the keys over HTTP before it verifies each request's token.
    providers: [getAuthConfigProvider({ jwks: process.env.JWKS })],
} satisfies AuthConfig;
