import type { IdentitySelection } from "@/components/identity-picker-shared";

export interface CurtainHuesInput {
    categoryColor: string | null | undefined;
    foregroundColor: string;
    identity: IdentitySelection;
    income: boolean;
    incomeColor: string;
}

/** `glowHues` has no default, so this module never imports `@/theme/glow`, which cannot load under node. */
export function computeCurtainHues(
    { identity, income, categoryColor, incomeColor, foregroundColor }: CurtainHuesInput,
    glowHues: (emoji: string) => string[]
): string[] | null {
    const identityEmpty = !(identity.emoji || identity.icon || identity.photoUri);
    if (identityEmpty) {
        return null;
    }
    const curtainTint =
        identity.color ?? identity.photoColor ?? (income ? incomeColor : (categoryColor ?? foregroundColor));
    if (identity.emoji) {
        return [...glowHues(identity.emoji).slice(0, 2), curtainTint];
    }
    if (identity.photoUri) {
        return [identity.photoColor ?? curtainTint];
    }
    return [curtainTint];
}
