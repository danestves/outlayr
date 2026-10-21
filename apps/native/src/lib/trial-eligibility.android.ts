import type { trialEligible as iosTrialEligible } from "@/lib/trial-eligibility";

/**
 * RevenueCat answers UNKNOWN for trial eligibility on Google Play, but Play only returns offers this user can still
 * take, so a free or intro phase on the default offer is the answer.
 */
export const trialEligible: typeof iosTrialEligible = (offer) => {
    const option = offer.product.defaultOption;
    return option?.freePhase != null || option?.introPhase != null;
};
