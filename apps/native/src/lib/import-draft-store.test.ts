import { describe, expect, it, vi } from "vite-plus/test";

import type { ParsedImportFile } from "@/data/transfer-core";
import { INITIAL_IMPORT_FLOW_STATE } from "@/domain/import-flow";
import type { MappingDraft } from "@/domain/import-mapping";

import { createImportDraftStore } from "./import-draft-store";

const PARSED: ParsedImportFile = {
    header: ["date", "description", "amount"],
    rows: [["01/08/2026", "Coffee", "3,50"]],
    width: 3,
};

const DRAFT: MappingDraft = {
    amount: 2,
    category: null,
    currency: null,
    date: 0,
    exchangeRate: null,
    exchangeRateType: null,
    note: 1,
    type: null,
};

function dispatchFileParsed(store: ReturnType<typeof createImportDraftStore>) {
    store.dispatch({
        draft: DRAFT,
        file: { chars: 42, name: "bank.csv" },
        gaps: ["noAmount"],
        parsed: PARSED,
        resolved: null,
        type: "fileParsed",
    });
}

describe("createImportDraftStore", () => {
    it("keeps getSnapshot identity stable across reads with no write between", () => {
        const store = createImportDraftStore();
        const first = store.getSnapshot();
        const second = store.getSnapshot();
        expect(first).toBe(second);
    });

    it("setStep updates ui.step and changes the snapshot identity", () => {
        const store = createImportDraftStore();
        const before = store.getSnapshot();

        store.setStep("file");

        expect(store.getSnapshot().ui.step).toBe("file");
        expect(store.getSnapshot()).not.toBe(before);
    });

    it("clear resets flow to INITIAL and ui.step to source", () => {
        const store = createImportDraftStore();
        store.dispatch({ sourceId: "csv", type: "sourceSelected" });
        store.setStep("file");
        store.setFileError({ cause: "empty" });

        store.clear();

        expect(store.getSnapshot().flow).toStrictEqual(INITIAL_IMPORT_FLOW_STATE);
        expect(store.getSnapshot().ui.step).toBe("source");
        expect(store.getSnapshot().ui.fileError).toBeNull();
    });

    it("notifies subscribers on dispatch and stops after unsubscribe", () => {
        const store = createImportDraftStore();
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);

        store.dispatch({ sourceId: "csv", type: "sourceSelected" });
        expect(listener).toHaveBeenCalledOnce();

        unsubscribe();
        store.setStep("file");
        expect(listener).toHaveBeenCalledOnce();
    });
});

describe("commitDismissal", () => {
    it("clears the draft when the flow is not resumable (no file parsed yet)", () => {
        const store = createImportDraftStore();
        store.dispatch({ sourceId: "csv", type: "sourceSelected" });
        store.setStep("file");

        store.commitDismissal();

        expect(store.getSnapshot().flow).toStrictEqual(INITIAL_IMPORT_FLOW_STATE);
        expect(store.getSnapshot().ui.step).toBe("source");
        expect(store.getResumeStep()).toBe("source");
    });

    it("preserves the draft and marks it resumed at the current step when the flow is resumable", () => {
        const store = createImportDraftStore();
        store.dispatch({ sourceId: "csv", type: "sourceSelected" });
        dispatchFileParsed(store);
        store.setStep("resolve");

        store.commitDismissal();

        expect(store.getSnapshot().flow.sourceId).toBe("csv");
        expect(store.getSnapshot().flow.parsed).toStrictEqual(PARSED);
        expect(store.getSnapshot().ui.step).toBe("resolve");
        expect(store.getSnapshot().ui.resumed).toBe(true);
        expect(store.getResumeStep()).toBe("resolve");
    });
});

describe("clearing ui.resumed", () => {
    it("dispatch clears ui.resumed, even for an event the reducer treats as a no-op", () => {
        const store = createImportDraftStore();
        store.dispatch({ sourceId: "csv", type: "sourceSelected" });
        dispatchFileParsed(store);
        store.setStep("resolve");
        store.commitDismissal();
        expect(store.getSnapshot().ui.resumed).toBe(true);

        store.dispatch({ row: 0, type: "rowToggled" });

        expect(store.getSnapshot().ui.resumed).toBe(false);
    });

    it("setStep clears ui.resumed when called with a genuinely different step", () => {
        const store = createImportDraftStore();
        store.dispatch({ sourceId: "csv", type: "sourceSelected" });
        dispatchFileParsed(store);
        store.setStep("resolve");
        store.commitDismissal();
        expect(store.getSnapshot().ui.resumed).toBe(true);

        store.setStep("review");

        expect(store.getSnapshot().ui.resumed).toBe(false);
    });

    it("setStep is idempotent on the step value alone: the resumed seed's own recorder must not clear the notice", () => {
        const store = createImportDraftStore();
        store.dispatch({ sourceId: "csv", type: "sourceSelected" });
        dispatchFileParsed(store);
        store.setStep("resolve");
        store.commitDismissal();
        expect(store.getSnapshot().ui.resumed).toBe(true);
        const before = store.getSnapshot();

        store.setStep("resolve");

        expect(store.getSnapshot().ui.resumed).toBe(true);
        expect(store.getSnapshot()).toBe(before);
    });
});
