import { describe, expect, it } from "vite-plus/test";

import { backupHandover } from "./backup-handover";

describe("backupHandover", () => {
    it("takes a cold-start file URL as is and names it from the path", () => {
        expect(
            backupHandover(
                "file:///private/var/mobile/Containers/Data/Application/X/Documents/Inbox/money%20data.mmbackup"
            )
        ).toStrictEqual({
            name: "money data.mmbackup",
            uri: "file:///private/var/mobile/Containers/Data/Application/X/Documents/Inbox/money%20data.mmbackup",
        });
    });

    it("takes an Android content URI whose path hides the file name", () => {
        expect(backupHandover("content://com.android.providers.downloads.documents/document/42")).toStrictEqual({
            name: "42",
            uri: "content://com.android.providers.downloads.documents/document/42",
        });
    });

    it("rebuilds a file URL from the bare path a running app receives", () => {
        expect(backupHandover("/private/var/mobile/Inbox/moneymanagerappdata.mmbackup")).toStrictEqual({
            name: "moneymanagerappdata.mmbackup",
            uri: "file:///private/var/mobile/Inbox/moneymanagerappdata.mmbackup",
        });
    });

    it("leaves deep links to the router", () => {
        expect(backupHandover("outlayr://transaction/abc")).toBeNull();
        expect(backupHandover("/transactions/abc")).toBeNull();
    });
});
