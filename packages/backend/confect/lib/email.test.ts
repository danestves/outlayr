import * as Effect from "effect/Effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { stubHttp } from "../test.helpers";
import { EmailError, sendEmail } from "./email";
import { runEdge } from "./runEdge";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe(sendEmail, () => {
    it("posts the message to the account's send endpoint with the bearer token", async () => {
        const http = stubHttp(() => Response.json({ success: true }));

        await runEdge(
            sendEmail("owner@example.com", { html: "<p>Body</p>", subject: "Hi", text: "Body" }).pipe(
                Effect.provide(http.layer)
            )
        );

        expect(http.requests).toHaveLength(1);
        const [request] = http.requests;
        expect(request?.url).toBe(
            "https://api.cloudflare.com/client/v4/accounts/test-cloudflare-account/email/sending/send"
        );
        expect(request?.method).toBe("POST");
        expect(request?.headers.get("authorization")).toBe("Bearer test-cloudflare-email-token");
        expect(JSON.parse(request?.body ?? "")).toStrictEqual({
            from: { address: "no-reply@tryoutlayr.com", name: "Outlayr" },
            html: "<p>Body</p>",
            subject: "Hi",
            text: "Body",
            to: "owner@example.com",
        });
    });

    it("fails with the provider's status when it refuses the message", async () => {
        const http = stubHttp(() => new Response("bad gateway", { status: 502 }));

        await expect(
            runEdge(sendEmail("owner@example.com", { subject: "Hi", text: "Body" }).pipe(Effect.provide(http.layer)))
        ).rejects.toThrow("Cloudflare refused the email with 502");
    });

    it("sends nothing when a provider variable is missing", async () => {
        vi.stubEnv("EMAIL_FROM", "");
        const http = stubHttp(() => Response.json({}));

        await expect(
            runEdge(sendEmail("owner@example.com", { subject: "Hi", text: "Body" }).pipe(Effect.provide(http.layer)))
        ).rejects.toBeInstanceOf(EmailError);
        expect(http.requests).toHaveLength(0);
    });
});
