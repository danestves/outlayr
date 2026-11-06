const DOMAIN_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normalizeDomain(raw: string): string | null {
    const domain = raw
        .trim()
        .toLowerCase()
        .replace(/^www\./, "");
    return DOMAIN_PATTERN.test(domain) ? domain : null;
}
