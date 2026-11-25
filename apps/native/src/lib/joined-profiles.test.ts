import { expect, test, vi } from "vite-plus/test";

vi.mock("expo-file-system", () => ({ File: vi.fn(), Paths: { document: {} } }));

import { joinedSetDiffers, planJoinedReconcile } from "./joined-profiles";
import type { JoinedProfile } from "./joined-profiles";

const look = (name: string) => ({
    customColor: null,
    emoji: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    name,
});

const joined = (profileId: string, name: string, joinedAt: number): JoinedProfile => ({
    joinedAt,
    look: look(name),
    ownerName: "Ana",
    profileId,
});

test("drops the active profile the server no longer lists and refreshes the rest", () => {
    const dropped = joined("4d1a7f52-3c8e-4a29-9b6f-0e5d2c7a8b10", "Home", 1);
    const kept = joined("8f2b6c41-7d3a-4e59-a0c8-5b9e1f6d2a07", "Work", 2);

    const plan = planJoinedReconcile(
        { departed: [], joined: [dropped, kept] },
        [{ ...kept, look: look("Studio") }],
        dropped.profileId
    );

    expect(plan.droppedActive).toBe(true);
    expect(plan.cache.departed).toStrictEqual([dropped.profileId]);
    expect(plan.cache.joined).toStrictEqual([{ ...kept, look: look("Studio") }]);
});

test("drops the active profile a crash left behind in the departed list", () => {
    const crashed = joined("4d1a7f52-3c8e-4a29-9b6f-0e5d2c7a8b10", "Home", 1);

    const plan = planJoinedReconcile({ departed: [crashed.profileId], joined: [] }, [], crashed.profileId);

    expect(plan.droppedActive).toBe(true);
    expect(plan.cache.departed).toStrictEqual([crashed.profileId]);
});

test("keeps the active profile open when the server lists a departed one again", () => {
    const rejoined = joined("4d1a7f52-3c8e-4a29-9b6f-0e5d2c7a8b10", "Home", 1);

    const plan = planJoinedReconcile({ departed: [rejoined.profileId], joined: [] }, [rejoined], rejoined.profileId);

    expect(plan.droppedActive).toBe(false);
    expect(plan.cache).toStrictEqual({ departed: [], joined: [rejoined] });
});

test("a live list without a cached profile asks for a reconcile", () => {
    const removed = joined("4d1a7f52-3c8e-4a29-9b6f-0e5d2c7a8b10", "Home", 1);
    const kept = joined("8f2b6c41-7d3a-4e59-a0c8-5b9e1f6d2a07", "Work", 2);

    expect(joinedSetDiffers({ departed: [], joined: [removed, kept] }, [kept])).toBe(true);
    expect(joinedSetDiffers({ departed: [], joined: [removed] }, [])).toBe(true);
});

test("a live list with the same profiles in another order and look asks for nothing", () => {
    const home = joined("4d1a7f52-3c8e-4a29-9b6f-0e5d2c7a8b10", "Home", 1);
    const work = joined("8f2b6c41-7d3a-4e59-a0c8-5b9e1f6d2a07", "Work", 2);

    expect(joinedSetDiffers({ departed: [], joined: [home, work] }, [{ ...work, look: look("Studio") }, home])).toBe(
        false
    );
});
