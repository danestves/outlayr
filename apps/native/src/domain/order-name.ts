import type { TranslateFn } from "@/i18n/context";

export function orderName(t: TranslateFn, purchase: { note: string } | null): string {
    return purchase?.note.trim() || t("installments.order");
}
