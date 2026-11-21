// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { Text } from "react-native";
import { describe, expect, it, vi } from "vite-plus/test";

import { AuthSessionProvider, sessionView, useAuthSession } from "./auth-session";

vi.mock<Partial<typeof import("@/lib/auth-client")>>(import("@/lib/auth-client"), () => ({ authClient: null }));

const PROVISIONAL_USER = { email: "provisional@example.com", id: "provisional-user", name: "Provisional" };

function Probe() {
    const session = useAuthSession();
    return <Text testID="probe">{JSON.stringify(session)}</Text>;
}

describe("useAuthSession", () => {
    it("apple-session-quarantined-until-grant-stored", () => {
        expect(sessionView({ user: PROVISIONAL_USER }, false, true)).toStrictEqual({
            accountId: null,
            billingId: null,
            gate: "restoring",
            profile: null,
        });
    });

    it("keeps the quarantine cover up after the cold-start restore budget has lapsed", () => {
        expect(sessionView({ user: PROVISIONAL_USER }, false, true, true).gate).toBe("restoring");
    });

    it("bills a guest while keeping the app signed out, even through a sign-in's quarantine", () => {
        const guest = { user: { ...PROVISIONAL_USER, id: "guest-user", isAnonymous: true } };

        expect(sessionView(guest, false, false)).toStrictEqual({
            accountId: null,
            billingId: "guest-user",
            gate: "signed-out",
            profile: null,
        });
        expect(sessionView(guest, false, true).billingId).toBe("guest-user");
    });

    it("makes zero cloud calls when no runtime is configured", () => {
        const { getByTestId } = render(
            <AuthSessionProvider>
                <Probe />
            </AuthSessionProvider>
        );

        expect(getByTestId("probe").textContent).toBe(
            JSON.stringify({ accountId: null, billingId: null, gate: "unconfigured", profile: null })
        );
    });
});
