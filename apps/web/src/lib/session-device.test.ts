import { expect, it } from "vite-plus/test";

import { sessionDevice } from "./session-device";

it.each([
    [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
        { browser: "Chrome", system: "Mac" },
    ],
    [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
        { browser: "Safari", system: "iPhone" },
    ],
    ["Mozilla/5.0 (Windows NT 10.0) Gecko/20100101 Firefox/133.0", { browser: "Firefox", system: "Windows" }],
    ["Mozilla/5.0 (Windows NT 10.0) Chrome/131.0 Safari/537.36 Edg/131.0", { browser: "Edge", system: "Windows" }],
    ["Outlayr/1 CFNetwork/1568 Darwin/24.0", { browser: undefined, system: "iPhone" }],
    ["okhttp/4.12.0", { browser: undefined, system: "Android" }],
    ["", { browser: undefined, system: undefined }],
])("reads %s", (agent, device) => {
    expect(sessionDevice(agent)).toStrictEqual(device);
});
