import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { runEdge } from "./runEdge";
import { sendEmail } from "./sendEmail";

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

function stubFetch(respond: () => Response) {
    const requests: Request[] = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            requests.push(new Request(input, init));
            return respond();
        })
    );
    return requests;
}

describe(sendEmail, () => {
    it("sends through the configured Cloudflare account as Outlayr", async () => {
        const requests = stubFetch(() =>
            Response.json({ result: { delivered: ["owner@example.com"] }, success: true })
        );

        await runEdge(sendEmail("owner@example.com", { subject: "Hi", text: "Body" }));

        expect(requests).toHaveLength(1);
        const [request] = requests;
        expect(request?.url).toContain("/accounts/test-cloudflare-account/");
        expect(request?.headers.get("authorization")).toBe("Bearer test-cloudflare-email-token");
        await expect(request?.json()).resolves.toMatchObject({
            from: { address: "no-reply@tryoutlayr.com", name: "Outlayr" },
            to: ["owner@example.com"],
        });
    });

    it("fails with the provider's status when it refuses the message", async () => {
        stubFetch(() => Response.json({ errors: [{ code: 10_001, message: "bad" }], success: false }, { status: 502 }));

        await expect(runEdge(sendEmail("owner@example.com", { subject: "Hi", text: "Body" }))).rejects.toThrow(
            "cloudflare refused the email with 502"
        );
    });

    it("writes the message to the log without a request when no provider is set", async () => {
        vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
        const requests = stubFetch(() => Response.json({}));
        const log = vi.spyOn(console, "log").mockReturnValue(undefined);

        await runEdge(sendEmail("owner@example.com", { subject: "Your code", text: "123456" }));

        expect(requests).toHaveLength(0);
        expect(log.mock.calls.flat().join(" ")).toContain("123456");
    });
});
