import type { AccountUser } from "@/domain/account";

const WHITESPACE = /\s+/;
const EMAIL_DOMAIN = /@.*$/;

function firstLetter(word: string): string {
    return [...word][0]?.toUpperCase() ?? "";
}

export function accountInitials(user: AccountUser | undefined): string {
    const name = user?.name?.trim();
    if (name) {
        const words = name.split(WHITESPACE);
        return `${firstLetter(words[0] ?? "")}${words.length > 1 ? firstLetter(words.at(-1) ?? "") : ""}`;
    }
    return firstLetter(user?.email?.trim().replace(EMAIL_DOMAIN, "") ?? "");
}
