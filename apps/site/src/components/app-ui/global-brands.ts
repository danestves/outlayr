import type { Brand, Streaming } from "./cast";

export type GlobalBrand = Streaming | "icloud" | "chatgpt" | "figma" | "github";

// Netflix and Spotify price by country; the rest charge one dollar price everywhere, so they convert at market rate.
export const GLOBAL: Record<GlobalBrand, Brand & { priced: "fx" | "ppp" | Streaming }> = {
    chatgpt: { logo: "chatgpt.com", name: "ChatGPT", priced: "fx" },
    figma: { logo: "figma.com", name: "Figma", priced: "fx" },
    github: { logo: "github.com", name: "GitHub", priced: "fx" },
    icloud: { logo: "icloud.com", name: "iCloud", priced: "ppp" },
    netflix: { logo: "netflix.com", name: "Netflix", priced: "netflix" },
    spotify: { logo: "spotify.com", name: "Spotify", priced: "spotify" },
};
