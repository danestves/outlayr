import { readFileSync } from "node:fs";

const origin = process.argv[2] ?? "https://logos.tryoutlayr.com";
const map = readFileSync(new URL("../../native/src/domain/merchant-map.ts", import.meta.url), "utf-8");
const domains = [...new Set([...map.matchAll(/domain: "([^"]+)"/g)].map((match) => match[1]))];

const RETRIES = 12;
const RETRY_WAIT_MS = 10_000;
const CONCURRENCY = 3;
const pause = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

const seed = async (domain) => {
    for (let attempt = 0; attempt < RETRIES; attempt += 1) {
        const response = await fetch(`${origin}/merchants/${domain}`, { method: "HEAD" });
        if (response.status !== 503) {
            return response.status;
        }
        await pause(RETRY_WAIT_MS);
    }
    return 503;
};

const missed = [];
const queue = [...domains];
await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
        for (let domain = queue.shift(); domain !== undefined; domain = queue.shift()) {
            if ((await seed(domain)) !== 200) {
                missed.push(domain);
            }
        }
    })
);
process.stdout.write(`${domains.length - missed.length} of ${domains.length} stored. Missing: ${missed.join(" ")}\n`);
