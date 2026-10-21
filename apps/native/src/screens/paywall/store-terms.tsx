import type { Plan } from "@/domain/pro-plans";

export interface StoreTermsProps {
    plan: Plan | null;
}

/** iOS adds nothing: StoreKit's purchase sheet states the terms. */
export function StoreTerms(_props: StoreTermsProps) {
    return null;
}
