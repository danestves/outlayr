import { BaseConvexClient } from "convex/browser";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

const ZERO_TS = "AAAAAAAAAAA=";
const STALE_TS = "BQAAAAAAAAA=";
const FIRST_TS = "AQAAAAAAAAA=";

class FakeSocket {
    static instances: FakeSocket[] = [];
    readonly sent: { type: string }[] = [];
    closed = false;
    onopen: (() => void) | null = null;
    onclose: ((event: { code: number; reason: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    onmessage: ((message: { data: string }) => void) | null = null;

    constructor() {
        FakeSocket.instances.push(this);
    }

    send(data: string) {
        this.sent.push(JSON.parse(data));
    }

    close() {
        this.closed = true;
        this.onclose?.({ code: 1000, reason: "" });
    }

    receive(message: ServerFrame) {
        this.onmessage?.({ data: JSON.stringify(message) });
    }
}

const transition = (startTs: string) => ({
    type: "Transition",
    startVersion: { querySet: 0, ts: startTs, identity: 0 },
    endVersion: { querySet: 1, ts: FIRST_TS, identity: 0 },
    modifications: [{ type: "QueryUpdated", queryId: 0, value: 42, logLines: [] }],
});

type ServerFrame = ReturnType<typeof transition>;

beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.instances = [];
});

afterEach(() => {
    vi.useRealTimers();
});

test("reconnects and resyncs when a transition starts from a version the client no longer has", async () => {
    const client = new BaseConvexClient("https://example.convex.cloud", () => undefined, {
        webSocketConstructor: FakeSocket as unknown as typeof WebSocket,
        unsavedChangesWarning: false,
        logger: false,
    });
    client.subscribe("ledger:list", {});

    const [first] = FakeSocket.instances;
    first?.onopen?.();
    expect(() => first?.receive(transition(STALE_TS))).not.toThrow();
    expect(first?.closed).toBe(true);
    expect(client.localQueryResult("ledger:list", {})).toBeUndefined();

    await vi.runOnlyPendingTimersAsync();
    const [, second] = FakeSocket.instances;
    second?.onopen?.();
    expect(second?.sent.map(({ type }) => type)).toContain("ModifyQuerySet");
    second?.receive(transition(ZERO_TS));

    expect(client.localQueryResult("ledger:list", {})).toBe(42);
    await client.close();
});
