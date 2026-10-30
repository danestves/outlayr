import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { CloudError } from "./cloud-error";
import { mirrorEntitlement } from "./entitlement-mirror";

const mockCloudAction = vi.fn<(action: unknown, args: Record<string, never>) => Effect.Effect<boolean, CloudError>>();

let mockConvex: object | null = {};
vi.mock("@/lib/convex", () => ({
    cloudAction: (action: unknown, args: Record<string, never>) => mockCloudAction(action, args),
    get convex() {
        return mockConvex;
    },
}));

beforeEach(() => {
    mockCloudAction.mockReset();
    mockConvex = {};
});

describe("mirrorEntitlement", () => {
    it("reports the mirror behind when the backend says so", async () => {
        mockCloudAction.mockReturnValue(Effect.succeed(false));

        await expect(Effect.runPromise(mirrorEntitlement())).resolves.toBe(false);
    });

    it("reports the mirror behind when the call fails", async () => {
        mockCloudAction.mockReturnValue(
            Effect.fail(
                new CloudError({ cause: new Error("offline"), kind: "action", path: "revenuecat:syncFromStore" })
            )
        );

        await expect(Effect.runPromise(mirrorEntitlement())).resolves.toBe(false);
    });

    it("reports a build with no backend as already mirrored", async () => {
        mockConvex = null;

        await expect(Effect.runPromise(mirrorEntitlement())).resolves.toBe(true);
        expect(mockCloudAction).not.toHaveBeenCalled();
    });
});
