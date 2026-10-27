import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { answerA2a } from "./a2a";

const call = async (body: string, version: string | null = "1.0") => {
    const response = await Effect.runPromise(
        answerA2a(
            new Request("https://tryoutlayr.com/a2a", {
                body,
                headers: version === null ? {} : { "a2a-version": version },
                method: "POST",
            })
        )
    );
    return response.json();
};

const send = (params: unknown) => JSON.stringify({ id: 7, jsonrpc: "2.0", method: "SendMessage", params });
const question = { message: { messageId: "m1", parts: [{ text: "What is Outlayr?" }], role: "ROLE_USER" } };

describe("answerA2a", () => {
    it("answers SendMessage with the product facts", async () => {
        const { id, result } = await call(send(question));
        expect(id).toBe(7);
        expect(result.message.role).toBe("ROLE_AGENT");
        expect(result.message.parts[0].text).toContain("# Outlayr");
        expect(result.message.contextId).toEqual(expect.any(String));
    });

    it("keeps the client's contextId", async () => {
        const { result } = await call(send({ message: { ...question.message, contextId: "c1" } }));
        expect(result.message.contextId).toBe("c1");
    });

    it.each([
        { body: "{", code: -32_700, version: "1.0" },
        { body: "[]", code: -32_600, version: "1.0" },
        { body: send(question), code: -32_009, version: null },
        {
            body: JSON.stringify({ id: 1, jsonrpc: "2.0", method: "GetTask", params: {} }),
            code: -32_601,
            version: "1.0",
        },
        { body: send({}), code: -32_602, version: "1.0" },
    ])("returns $code", async ({ body, code, version }) => {
        const { error } = await call(body, version);
        expect(error.code).toBe(code);
    });
});
