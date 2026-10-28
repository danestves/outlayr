import { describe, expect, it, vi } from "vite-plus/test";

import { pressSubmit, pressSubmitWith } from "./submit-guard";

describe("pressSubmit", () => {
    it("calls handleSubmit when the form is not submitting", () => {
        const handleSubmit = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
        pressSubmit({ handleSubmit, state: { isSubmitting: false } });
        expect(handleSubmit).toHaveBeenCalledOnce();
    });

    it("does not call handleSubmit when the form is already submitting", () => {
        const handleSubmit = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
        pressSubmit({ handleSubmit, state: { isSubmitting: true } });
        expect(handleSubmit).not.toHaveBeenCalled();
    });

    it("catches a rejected handleSubmit instead of producing an unhandled rejection", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const handleSubmit = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("boom"));

        pressSubmit({ handleSubmit, state: { isSubmitting: false } });
        await Promise.resolve();
        await Promise.resolve();

        expect(consoleError).toHaveBeenCalledWith("Form submit threw", expect.any(Error));
        consoleError.mockRestore();
    });
});

describe("pressSubmitWith", () => {
    it("passes meta through to handleSubmit", () => {
        const handleSubmit = vi.fn<(meta: "continue") => Promise<void>>().mockResolvedValue(undefined);
        pressSubmitWith({ handleSubmit, state: { isSubmitting: false } }, "continue");
        expect(handleSubmit).toHaveBeenCalledWith("continue");
    });

    it("does not call handleSubmit when the form is already submitting", () => {
        const handleSubmit = vi.fn<(meta: "finish") => Promise<void>>().mockResolvedValue(undefined);
        pressSubmitWith({ handleSubmit, state: { isSubmitting: true } }, "finish");
        expect(handleSubmit).not.toHaveBeenCalled();
    });
});
