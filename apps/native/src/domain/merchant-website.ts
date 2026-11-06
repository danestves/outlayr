const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//;
const PATH_START = /[/?#]/;
const PORT = /:\d+$/;
const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function websiteDomain(input: string): string | null {
    const withoutScheme = input.trim().toLowerCase().replace(SCHEME, "");
    const authority = withoutScheme.split(PATH_START)[0] ?? "";
    const host = (authority.split("@").at(-1) ?? "").replace(PORT, "").replace(/^www\./, "");
    return HOST.test(host) ? host : null;
}
