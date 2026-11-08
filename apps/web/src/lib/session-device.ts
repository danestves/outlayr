const BROWSERS = [
    [/Edg\//u, "Edge"],
    [/Firefox\/|FxiOS\//u, "Firefox"],
    [/Chrome\/|CriOS\//u, "Chrome"],
    [/Safari\//u, "Safari"],
] as const;

const SYSTEMS = [
    [/iPhone/u, "iPhone"],
    [/iPad/u, "iPad"],
    [/Android|okhttp/u, "Android"],
    [/Mac OS X|Macintosh/u, "Mac"],
    [/Windows/u, "Windows"],
    [/Linux|X11/u, "Linux"],
    [/CFNetwork|Darwin/u, "iPhone"],
] as const;

const labelFrom = (table: readonly (readonly [RegExp, string])[], agent: string) =>
    table.find(([pattern]) => pattern.test(agent))?.[1];

export interface SessionDevice {
    browser?: string;
    system?: string;
}

export function sessionDevice(agent: string): SessionDevice {
    return { browser: labelFrom(BROWSERS, agent), system: labelFrom(SYSTEMS, agent) };
}
