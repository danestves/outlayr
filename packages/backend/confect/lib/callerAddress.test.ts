import * as Option from "effect/Option";
import { describe, expect, it } from "vite-plus/test";

import { callerAddress } from "./callerAddress";

const keyFor = (value: string) => Option.getOrNull(callerAddress(new Headers({ "cf-connecting-ip": value })));

describe("callerAddress", () => {
    it("gives every address in one IPv6 /64 the same key, however it is written", () => {
        expect(keyFor("2001:DB8:0:a::1")).toBe("2001:db8:0:a::/64");
        expect(keyFor("2001:0db8:0000:000a:ffff:1:2:3")).toBe("2001:db8:0:a::/64");
        expect(keyFor("2001:db8::")).toBe("2001:db8:0:0::/64");
        expect(keyFor("::1")).toBe("0:0:0:0::/64");
    });

    it("keeps IPv4 whole and ignores what is not an address", () => {
        expect(keyFor(" 203.0.113.7 ")).toBe("203.0.113.7");
        expect(keyFor("1:2:3:4:5:6:7:8:9")).toBeNull();
        expect(keyFor("1::2::3")).toBeNull();
        expect(keyFor("999.1.1.1")).toBeNull();
        expect(Option.getOrNull(callerAddress(new Headers()))).toBeNull();
    });
});
