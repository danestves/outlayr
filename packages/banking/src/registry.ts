import type { BankingProvider, BankingProviderName } from "./provider";
import { stripe } from "./providers/stripe/provider";

export const bankingProviders = {
    stripe,
} satisfies Record<BankingProviderName, BankingProvider>;
