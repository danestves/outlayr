import type { ROW_TYPE as ROW_TYPE_BASE } from "./row-type";

export const ROW_TYPE = {
    amount: "font-sans-medium text-body leading-6",
    balance: "font-sans-medium text-body leading-6",
    cell: "font-sans-medium text-body",
    name: "font-sans text-body leading-6",
    subtitle: "font-sans text-caption leading-5",
    subtotal: "font-sans-medium",
    title: "font-sans text-body leading-6",
} as const satisfies Record<keyof typeof ROW_TYPE_BASE, string>;
