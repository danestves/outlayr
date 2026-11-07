import { openBrowserAsync } from "expo-web-browser";
import { Alert, Linking } from "react-native";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { takeHandoff } from "./app-handoff";
import { openWebLink } from "./web-link";

vi.mock("expo-web-browser", () => ({ openBrowserAsync: vi.fn(async () => ({ type: "opened" })) }));

const URL = "https://www.notion.com/help/export-your-content";
const browser = vi.mocked(openBrowserAsync);

describe("openWebLink", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        browser.mockReset();
    });

    it("stays out of the in-app browser when the system opens the link", async () => {
        const alert = vi.spyOn(Alert, "alert");
        const openURL = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);

        openWebLink(URL);

        await vi.waitFor(() => expect(openURL).toHaveBeenCalledWith(URL));
        expect(browser).not.toHaveBeenCalled();
        expect(alert).not.toHaveBeenCalled();
    });

    it("opens the in-app browser when the system refuses the link", async () => {
        const alert = vi.spyOn(Alert, "alert");
        vi.spyOn(Linking, "openURL").mockRejectedValue(new Error(`Unable to open URL: ${URL}`));

        openWebLink(URL);

        await vi.waitFor(() => expect(browser).toHaveBeenCalledWith(URL));
        expect(alert).not.toHaveBeenCalled();
    });

    it("tells the user when neither can open the link", async () => {
        const alert = vi.spyOn(Alert, "alert").mockReturnValue(undefined);
        vi.spyOn(Linking, "openURL").mockRejectedValue(new Error(`Unable to open URL: ${URL}`));
        browser.mockRejectedValue(new Error("No browser"));

        openWebLink(URL);

        await vi.waitFor(() => expect(alert).toHaveBeenCalledOnce());
    });

    it("announces the trip to the app lock", () => {
        vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);

        openWebLink(URL);

        expect(takeHandoff()).toBe(true);
    });
});
