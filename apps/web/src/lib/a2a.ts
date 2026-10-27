import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import facts from "../../public/llms.txt?raw";

const RpcCall = Schema.Struct({
    id: Schema.optionalKey(Schema.NullOr(Schema.Union([Schema.String, Schema.Finite]))),
    jsonrpc: Schema.Literal("2.0"),
    method: Schema.String,
    params: Schema.Unknown,
});

const SendMessageParams = Schema.Struct({
    message: Schema.Struct({
        contextId: Schema.optionalKey(Schema.String),
        parts: Schema.Array(Schema.Unknown),
    }),
});

const decodeRpcCall = Schema.decodeUnknownOption(RpcCall);
const decodeSendMessageParams = Schema.decodeUnknownOption(SendMessageParams);

interface AgentMessage {
    contextId: string;
    messageId: string;
    parts: { mediaType: string; text: string }[];
    role: "ROLE_AGENT";
}
type RpcOutcome = { result: { message: AgentMessage } } | { error: { code: number; message: string } };

const SUPPORTED_VERSION = /^1\.0(?:\.|$)/u;

function reply(id: string | number | null, outcome: RpcOutcome): Response {
    return Response.json({ id, jsonrpc: "2.0", ...outcome });
}

export async function answerA2a(request: Request): Promise<Response> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return reply(null, { error: { code: -32_700, message: "Parse error" } });
    }
    const call = decodeRpcCall(body);
    if (Option.isNone(call)) {
        return reply(null, { error: { code: -32_600, message: "Invalid Request" } });
    }
    const id = call.value.id ?? null;
    const version = request.headers.get("a2a-version") ?? new URL(request.url).searchParams.get("A2A-Version") ?? "";
    if (!SUPPORTED_VERSION.test(version)) {
        return reply(id, { error: { code: -32_009, message: "Only A2A-Version 1.0 is supported" } });
    }
    if (call.value.method !== "SendMessage") {
        return reply(id, { error: { code: -32_601, message: "Method not found" } });
    }
    const params = decodeSendMessageParams(call.value.params);
    if (Option.isNone(params)) {
        return reply(id, { error: { code: -32_602, message: "params.message with parts is required" } });
    }
    return reply(id, {
        result: {
            message: {
                contextId: params.value.message.contextId ?? crypto.randomUUID(),
                messageId: crypto.randomUUID(),
                parts: [{ mediaType: "text/markdown", text: facts }],
                role: "ROLE_AGENT",
            },
        },
    });
}
