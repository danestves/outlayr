import { useIntlayer } from "react-intlayer";

type Presets = ReturnType<typeof useIntlayer<"category-presets">>;

// SAFETY: category-presets is generated from these names by this same camelCase rule.
const presetKey = (name: string) =>
    name
        .toLowerCase()
        .replaceAll(/[^a-z]+(.)/gu, (_, letter: string) => letter.toUpperCase())
        .replaceAll(/[^a-zA-Z]/gu, "") as keyof Presets;

export function usePresetLabel() {
    const presets = useIntlayer("category-presets");
    return (name: string) => presets[presetKey(name)]?.value ?? name;
}
