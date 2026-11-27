const NOT_A_FIGURE = /[^\d\s.,-]/gu;
const LEADING_MARKS = /^[\s.,]+/u;
const TRAILING_MARKS = /[\s.,]+$/u;
const DIGIT = /\d/u;

export interface TypedFigure {
    readonly figure: string;
    readonly labelled: boolean;
}

export function typedFigure(text: string, labelled: boolean): TypedFigure {
    const figure = text.replaceAll(NOT_A_FIGURE, "");
    const dropped = figure !== text;
    if (text === "" || !(labelled || dropped)) {
        return { figure: text, labelled: false };
    }
    const lead = figure.replace(LEADING_MARKS, "");
    return { figure: dropped ? lead.replace(TRAILING_MARKS, "") : lead, labelled: !DIGIT.test(lead) };
}
