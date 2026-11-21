import type { AuthGate } from "@/domain/auth-gate";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { useAuthSession } from "@/lib/auth-session";

// A guest that bought Pro opens the AI screens too: the server admits it on the purchase, not on an account.
export function useAiGate(): AuthGate {
    const { accountId, billingId, gate } = useAuthSession();
    const proGuest = useProEntitled() && accountId === null && billingId !== null;
    return proGuest ? "signed-in" : gate;
}
