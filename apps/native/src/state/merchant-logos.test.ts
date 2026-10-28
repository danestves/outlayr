import * as Effect from "effect/Effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { fetchedLogosAtom, logoDomainsKey } from "./merchant-logos";

const mockFiles = new Map<string, string>();

vi.mock("@/lib/logo-cache", () => ({
    cachedLogoUri: (key: string) => mockFiles.get(key) ?? null,
    logoCacheKey: (name: string) => name,
    readCachedLogo: () => Effect.succeed({ kind: "unknown" }),
    writeCachedLogo: (key: string, bytes: Uint8Array | null) => {
        if (bytes !== null) {
            mockFiles.set(key, `file:///${key}`);
        }
    },
}));

vi.mock<Partial<typeof import("@/env")>>(import("@/env"), () => ({
    ENV: { EXPO_PUBLIC_LOGO_DEV_TOKEN: "pk_test" },
}));

const LOGO_BYTES = new Uint8Array(1024)
    .fill(0x42)
    .map((byte, index) => (index < 4 ? [0x89, 0x50, 0x4e, 0x47][index] : byte));

let inFlight = 0;
let mostInFlight = 0;

function stubFetch(failing: ReadonlySet<string>) {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        inFlight += 1;
        mostInFlight = Math.max(mostInFlight, inFlight);
        await new Promise((resolve) => {
            setTimeout(resolve, 10);
        });
        inFlight -= 1;
        const url = String(input);
        const failed = [...failing].some((domain) => url.includes(domain));
        return failed
            ? new Response(null, { headers: { "content-type": "application/json" }, status: 404 })
            : new Response(LOGO_BYTES, { headers: { "content-type": "image/png" }, status: 200 });
    });
}

const scheduleTask = (task: () => void) => {
    const timer = setTimeout(task, 0);
    return () => {
        clearTimeout(timer);
    };
};

async function settled(domains: readonly string[]) {
    const registry = AtomRegistry.make({ scheduleTask });
    const atom = fetchedLogosAtom(logoDomainsKey(domains));
    const result = await Effect.runPromise(AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }));
    registry.dispose();
    return result;
}

describe("fetchedLogosAtom", () => {
    beforeEach(() => {
        mockFiles.clear();
        inFlight = 0;
        mostInFlight = 0;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("fetches four domains at a time, skips the ones already on disk and files a failed fetch as null", async () => {
        stubFetch(new Set(["g.example"]));
        mockFiles.set("a.example", "file:///a.example");
        const domains = ["a.example", "b.example", "c.example", "d.example", "e.example", "f.example", "g.example"];

        const fetched = await settled(domains);

        expect(mostInFlight).toBe(4);
        expect(fetched.has("a.example")).toBe(false);
        expect(fetched.get("b.example")).toBe("file:///b.example");
        expect(fetched.get("f.example")).toBe("file:///f.example");
        expect(fetched.get("g.example")).toBeNull();
    });

    it("settles empty without a request when there is no domain", async () => {
        stubFetch(new Set());

        const fetched = await settled([]);

        expect(fetched.size).toBe(0);
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });
});
