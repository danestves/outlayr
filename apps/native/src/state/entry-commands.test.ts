import { describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";

import { voidFlowCommand } from "./entry-commands";

describe("voidFlowCommand", () => {
    it("logs a flow's error at error level, so it reaches console.error and LogBox", async () => {
        const registry = AtomRegistry.make();
        const error = jest.spyOn(console, "error").mockImplementation(() => {});
        const log = jest.spyOn(console, "log").mockImplementation(() => {});

        await voidFlowCommand.run(registry, Effect.logError("Failed to attach a file"));

        expect(error.mock.calls.flat().join(" ")).toContain("Failed to attach a file");
        expect(log).not.toHaveBeenCalled();
        error.mockRestore();
        log.mockRestore();
        registry.dispose();
    });
});
