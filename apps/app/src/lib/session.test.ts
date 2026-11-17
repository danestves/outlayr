import { describe, expect, it } from "vite-plus/test";

import { tokenProfile } from "./session";

const tokenOf = (claims: Record<string, boolean | number | string>) =>
    `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;

describe("tokenProfile", () => {
    it("reads a name outside ASCII as it was written", () => {
        const profile = tokenProfile(
            tokenOf({
                email: "jose@example.com",
                emailVerified: true,
                exp: 1,
                name: "José Peña 💸",
                sessionId: "session-1",
                sub: "user-1",
            })
        );
        expect(profile).toEqual({
            email: "jose@example.com",
            emailVerified: true,
            id: "user-1",
            image: null,
            name: "José Peña 💸",
            sessionId: "session-1",
        });
    });
});
