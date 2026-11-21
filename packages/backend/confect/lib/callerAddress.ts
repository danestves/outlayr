import * as Option from "effect/Option";

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const HEXTET = /^[\da-f]{1,4}$/i;
const IPV6_HEXTETS = 8;
const IPV6_PREFIX_HEXTETS = 4;

const ipv6Prefix = (address: string) => {
    const halves = address.split("::");
    if (halves.length > 2) {
        return Option.none<string>();
    }
    const [head = "", tail] = halves;
    const left = head === "" ? [] : head.split(":");
    const right = tail === undefined || tail === "" ? [] : tail.split(":");
    const missing = IPV6_HEXTETS - left.length - right.length;
    const wellFormed =
        [...left, ...right].every((part) => HEXTET.test(part)) && (tail === undefined ? missing === 0 : missing > 0);
    if (!wellFormed) {
        return Option.none<string>();
    }
    const prefix = [...left, ...Array.from({ length: missing }, () => "0"), ...right]
        .slice(0, IPV6_PREFIX_HEXTETS)
        .map((part) => Number.parseInt(part, 16).toString(16));
    return Option.some(`${prefix.join(":")}::/64`);
};

/**
 * Cloudflare sets `cf-connecting-ip` and refuses requests that bring their own (error 1000), and prod's origin only
 * takes traffic from the tunnel. IPv6 is cut to its /64, since one host usually holds the whole block.
 */
export const callerAddress = (headers: Headers) => {
    const address = headers.get("cf-connecting-ip")?.trim() ?? "";
    if (IPV4.test(address)) {
        return Option.some(address);
    }
    return address.includes(":") ? ipv6Prefix(address) : Option.none<string>();
};
