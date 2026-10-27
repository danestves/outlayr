import { cloudRuntime } from "./cloud-runtime";

export const authClient = cloudRuntime?.authClient ?? null;

function unconfiguredSession(): never {
    throw new Error("useAuthClientSession was called without a configured auth client");
}

export const useAuthClientSession = authClient?.useSession ?? unconfiguredSession;
