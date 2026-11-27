export interface AmountSeparators {
    readonly decimal: string;
    readonly group: string;
}

const DIGIT = /^\d$/u;
const HAS_DIGIT = /\d/u;

export const amountSeparators = (locale: string): AmountSeparators => {
    const parts = new Intl.NumberFormat(locale).formatToParts(1_234_567.89);
    const valueOf = (type: "decimal" | "group") => parts.find((part) => part.type === type)?.value;
    return { decimal: valueOf("decimal") ?? ".", group: valueOf("group") ?? "," };
};

export const acceptsTypedAmountCharacter = (character: string, text: string, separators: AmountSeparators): boolean => {
    if (DIGIT.test(character) || character === "-") {
        return true;
    }
    const separates = character === " " || character === separators.decimal || character === separators.group;
    return separates && HAS_DIGIT.test(text);
};
