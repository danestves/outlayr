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

function pipe(from: WebSocket, to: WebSocket) {
    from.addEventListener("message", (event) => {
        try {
            to.send(event.data);
        } catch {
            from.close(1011);
        }
    });
    from.addEventListener("close", (event) => {
        try {
            to.close(event.code === 1005 ? 1000 : event.code, event.reason);
        } catch {
            // Already closed from the other side.
        }
    });
    from.addEventListener("error", () => {
        try {
            to.close(1011);
        } catch {
            // Already closed from the other side.
        }
    });
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
