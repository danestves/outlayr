import type { TranslateFn } from "@/i18n/context";

export function listNames(names: readonly string[], t: TranslateFn): string {
    const [first = "", second = "", third = ""] = names;
    switch (names.length) {
        case 0:
        case 1: {
            return first;
        }
        case 2: {
            return t("insights.savings.listTwo", { first, second });
        }
        case 3: {
            return t("insights.savings.listThree", { first, second, third });
        }
        default: {
            return t("insights.savings.listMore", { count: names.length - 2, first, second });
        }
    }
}
