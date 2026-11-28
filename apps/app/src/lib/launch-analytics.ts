import { WEB_ANALYTICS_AT_MS } from "@outlayr/backend/confect/legal";
import { analyticsStarted, captureConsented, identify, resetIdentity } from "@outlayr/shared/analytics";

import type { BankLinkOutcome } from "./linked-banks";

export type SignInMethod = "apple" | "email" | "google";

type LaunchEvent =
    | {
          event: "bank_link_finished";
          properties: { accounts: number; outcome: BankLinkOutcome["kind"]; relink: boolean };
      }
    | { event: "paywall_viewed" }
    | { event: "purchase_started"; properties: { plan: string } }
    | { event: "signed_in"; properties: { method: string } }
    | {
          event: "transaction_saved";
          properties: {
              mode: "create";
              source: "form" | "onboarding" | "voice";
              transaction_type: "expense" | "income";
          };
      };

const PENDING = "outlayr:pending-sign-in";

const live = () => Date.now() >= WEB_ANALYTICS_AT_MS;

let account: string | undefined;

export function track(launch: LaunchEvent) {
    const owner = account;
    if (!live() || owner === undefined) {
        return;
    }
    identify(owner);
    void analyticsStarted.then(() => {
        if (account === owner) {
            captureConsented(launch.event, "properties" in launch ? launch.properties : undefined);
        }
    });
}

function takePending() {
    try {
        const method = sessionStorage.getItem(PENDING);
        sessionStorage.removeItem(PENDING);
        return method;
    } catch {
        return null;
    }
}

export function rememberSignIn(method: SignInMethod) {
    if (!live()) {
        return false;
    }
    try {
        sessionStorage.setItem(PENDING, method);
        return true;
    } catch {
        return false;
    }
}

export function followSession(id: string | undefined) {
    account = id;
    if (id === undefined) {
        takePending();
        resetIdentity();
        return;
    }
    const method = takePending();
    if (!live()) {
        return;
    }
    identify(id);
    if (method !== null) {
        track({ event: "signed_in", properties: { method } });
    }
}
