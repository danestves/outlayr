const PATH = "/v1/speech-to-text/realtime";
const UPSTREAM = "https://api.elevenlabs.io";
const FORWARDED_PARAMS = ["audio_format", "commit_strategy", "language_code", "model_id", "token"] as const;

const refuse = (status: number) => new Response(null, { status });

function upstreamUrl(request: URL): URL | null {
    if (request.searchParams.get("token") === null) {
        return null;
    }
    const url = new URL(PATH, UPSTREAM);
    for (const name of FORWARDED_PARAMS) {
        const value = request.searchParams.get(name);
        if (value !== null) {
            url.searchParams.set(name, value);
        }
    }
    return url;
}

const NORMAL_CLOSE = 1000;
const FAILED_CLOSE = 1011;

// 1005 and 1006 only describe a close locally; sending them throws and would leave the other side open.
function sendableCode(code: number): number {
    if (code === 1005) {
        return NORMAL_CLOSE;
    }
    const allowed = (code >= 1000 && code <= 1003) || (code >= 1007 && code <= 1011) || (code >= 3000 && code <= 4999);
    return allowed ? code : FAILED_CLOSE;
}

function shut(socket: WebSocket, code: number, reason?: string) {
    try {
        socket.close(code, reason);
    } catch {
        // Already closed.
    }
}

function pipe(from: WebSocket, to: WebSocket) {
    from.addEventListener("message", (event) => {
        try {
            to.send(event.data);
        } catch {
            shut(from, FAILED_CLOSE);
            shut(to, FAILED_CLOSE);
        }
    });
    from.addEventListener("close", (event) => shut(to, sendableCode(event.code), event.reason));
    from.addEventListener("error", () => shut(to, FAILED_CLOSE));
}

export default {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname !== PATH) {
            return refuse(404);
        }
        if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
            return refuse(426);
        }
        const target = upstreamUrl(url);
        if (target === null) {
            return refuse(401);
        }
        // A fresh request carries none of the phone's headers, so ElevenLabs sees only Cloudflare.
        const upstream = await fetch(target, { headers: { upgrade: "websocket" } });
        const server = upstream.webSocket;
        if (server === null) {
            return refuse(upstream.status === 101 ? 502 : upstream.status);
        }
        server.accept();
        const { 0: client, 1: relay } = new WebSocketPair();
        relay.accept();
        pipe(relay, server);
        pipe(server, relay);
        return new Response(null, { status: 101, webSocket: client });
    },
} satisfies ExportedHandler;
