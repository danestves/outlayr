import { useIntlayer } from "react-intlayer";

export function useNames() {
    const { names } = useIntlayer("demo");
    const byValue = new Map<string, string>(Object.entries(names).map(([value, name]) => [value, name.value]));
    return (value: string) => byValue.get(value) ?? value;
}
