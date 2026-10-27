import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import * as Stream from "effect/Stream";

import { cachedLogoUri, logoCacheKey } from "@/lib/logo-cache";
import { fetchMerchantImage } from "@/lib/logo-fetch";
import { appRuntime } from "@/lib/runtime";

const FETCH_BATCH = 4;
const DOMAIN_SEPARATOR = "\n";

export type FetchedLogos = ReadonlyMap<string, string | null>;

export const NO_FETCHED_LOGOS: FetchedLogos = new Map();

export function logoDomainsKey(domains: Iterable<string>): string {
    return [...new Set(domains)].sort().join(DOMAIN_SEPARATOR);
}

export const fetchedLogosAtom = Atom.family((domains: string) =>
    appRuntime
        .atom(
            Stream.fromIterable(domains === "" ? [] : domains.split(DOMAIN_SEPARATOR)).pipe(
                Stream.filter((domain) => cachedLogoUri(logoCacheKey(domain, domain)) === null),
                Stream.mapEffect(
                    (domain) =>
                        fetchMerchantImage({ domain, name: domain }).pipe(
                            Effect.exit,
                            Effect.uninterruptible,
                            Effect.as(logoCacheKey(domain, domain))
                        ),
                    { concurrency: FETCH_BATCH, unordered: true }
                ),
                Stream.scan(
                    () => NO_FETCHED_LOGOS,
                    (fetched, key) => {
                        const uri = cachedLogoUri(key);
                        // Compared by VALUE, not presence: a timed-out first attempt records null, and a presence check
                        // would refuse the later attempt that succeeds.
                        return fetched.get(key) === uri ? fetched : new Map(fetched).set(key, uri);
                    }
                )
            )
        )
        .pipe(Atom.withLabel("merchant-logos:fetched"))
);
