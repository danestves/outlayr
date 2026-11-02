import { describe, expect, it } from "vite-plus/test";

import { budgetLink, DEEP_LINKS, redirectLaunchPath, resolveDeepLink, transactionLink } from "./deep-links";

describe("resolveDeepLink", () => {
    it("maps every canonical link the widgets and intents emit", () => {
        expect(resolveDeepLink(DEEP_LINKS.log)).toBe("/");
        expect(resolveDeepLink(DEEP_LINKS.insights)).toBe("/insights");
        expect(resolveDeepLink(DEEP_LINKS.budgets)).toBe("/balances?view=categories");
        expect(resolveDeepLink(DEEP_LINKS.overallBudget)).toBe("/balances/overall");
        expect(resolveDeepLink(DEEP_LINKS.search)).toBe("/search");
        expect(resolveDeepLink(DEEP_LINKS.newExpense)).toBe("/transactions/create");
        expect(resolveDeepLink(DEEP_LINKS.newIncome)).toBe("/transactions/create?income=1");
        expect(resolveDeepLink(DEEP_LINKS.voice)).toBe("/transactions/voice");
        expect(resolveDeepLink(DEEP_LINKS.scan)).toBe("/transactions/scan");
    });

    it("accepts the bare path form expo-router hands it while running", () => {
        expect(resolveDeepLink("/budgets/overall")).toBe("/balances/overall");
        expect(resolveDeepLink("new?income=1")).toBe("/transactions/create?income=1");
    });

    it("routes a single transaction, which is what Spotlight opens", () => {
        expect(resolveDeepLink(transactionLink("abc123"))).toBe("/transactions/abc123");
        expect(resolveDeepLink(budgetLink("b7"))).toBe("/balances/b7");
    });

    it("sends the old Budgets screens to where they moved", () => {
        expect(resolveDeepLink("outlayr://budgets/goals/g1")).toBe("/balances/goals/g1");
        expect(resolveDeepLink("/budgets/plan/202611")).toBe("/insights/plan/202611");
        expect(resolveDeepLink("outlayr://budgets?from=widget")).toBe("/balances?view=categories&from=widget");
    });

    it("degrades a host with no id to its section rather than to not-found", () => {
        expect(resolveDeepLink("outlayr://transaction")).toBe("/");
    });

    it("still answers the retired Swift hosts", () => {
        expect(resolveDeepLink("outlayr://newExpense")).toBe("/transactions/create");
        expect(resolveDeepLink("outlayr://budget")).toBe("/balances?view=categories");
        expect(resolveDeepLink("outlayr://transactions")).toBe("/");
    });

    it("lets a route under a retired host through instead of collapsing it to the host", () => {
        expect(resolveDeepLink("outlayr://transactions/scan")).toBeNull();
        expect(resolveDeepLink("/transactions/scan")).toBeNull();
    });

    it("is case-insensitive on the host, as URLs are", () => {
        expect(resolveDeepLink("outlayr://Budgets")).toBe("/balances?view=categories");
    });

    it("declines anything outside the contract so ordinary paths pass through", () => {
        expect(resolveDeepLink("outlayr://")).toBeNull();
        expect(resolveDeepLink("/settings/currency")).toBeNull();
        expect(resolveDeepLink("exp://192.168.1.4:8081")).toBeNull();
    });
});

describe("redirectLaunchPath", () => {
    function drainSpy() {
        const calls = { count: 0 };
        return [
            () => {
                calls.count += 1;
            },
            calls,
        ] as const;
    }

    it("still routes the link the app was launched from", () => {
        const [drain, calls] = drainSpy();
        expect(redirectLaunchPath({ initial: true, path: DEEP_LINKS.newExpense }, drain)).toBe("/transactions/create");
        expect(calls.count).toBe(1);
    });

    it("drains a launch that carried no deep link", () => {
        const [drain, calls] = drainSpy();
        expect(redirectLaunchPath({ initial: true, path: "outlayr:///" }, drain)).toBe("outlayr:///");
        expect(calls.count).toBe(1);
    });

    it("leaves the registry alone for a link arriving while the app runs", () => {
        const [drain, calls] = drainSpy();
        expect(redirectLaunchPath({ initial: false, path: DEEP_LINKS.budgets }, drain)).toBe(
            "/balances?view=categories"
        );
        expect(calls.count).toBe(0);
    });
});
