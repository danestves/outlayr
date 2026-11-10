import { convexQuery } from "@convex-dev/react-query";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useLoaderData, useNavigate } from "@tanstack/react-router";
import { useContext, useState, useSyncExternalStore } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useAccountFlows, useLedgerDb } from "@/components/dashboard/accounts/flows";
import { useDateFormat } from "@/components/dashboard/home/format";
import { usePresetLabel } from "@/components/dashboard/settings/categories/preset-label";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { categoryPush, seededCategories } from "@/lib/category-writes";
import { convexClient } from "@/lib/convex";
import { wallText } from "@/lib/entry-writes";
import { clockOf } from "@/lib/ledger";
import type { CommitOutcome } from "@/lib/ledger-committer";
import { LedgerSettingsContext, useDisplayFormat, writeSettings } from "@/lib/ledger-settings";
import { freshProgress, readProgress, screenOf, stepIndex, subscribeProgress, writeProgress } from "@/lib/onboarding";
import type { OnboardingProgress, OnboardingScreen } from "@/lib/onboarding";
import { currentPush, pushAccess, subscribePush } from "@/lib/web-push";

import { AutoLog } from "./auto-log";
import { Currency } from "./currency";
import { Done } from "./done";
import { FirstEntry } from "./first-entry";
import { ImportSources, MoneyManagerSteps } from "./import";
import { Rhythm } from "./rhythm";
import { Welcome } from "./welcome";

const DAY_LENGTH = 10;
const noProgress = () => null;

/** A typed address cannot skip ahead of the furthest screen reached, and a saved first entry is not asked for twice. */
function shownScreen(asked: OnboardingScreen | null, reached: OnboardingScreen, entered: boolean): OnboardingScreen {
    const screen = asked !== null && stepIndex(asked) <= stepIndex(reached) ? asked : reached;
    return screen === "first-entry" && entered ? "done" : screen;
}

export function Onboarding({ step }: { step: string | undefined }) {
    const navigate = useNavigate();
    const userId = useLoaderData({ from: "/_account/app", select: (loaded) => loaded.userId });
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { ledger } = useDashboard();
    const settings = useContext(LedgerSettingsContext);
    const flows = useAccountFlows();
    const labelOf = usePresetLabel();
    const date = useDateFormat();
    const { clockTime } = useDisplayFormat();
    const { locale } = useLocale();
    const copy = useIntlayer("dashboard-onboarding");
    const { data: push } = useQuery(convexQuery(api.webPush.config, {}));
    const stored = useSyncExternalStore(subscribeProgress, () => readProgress(userId), noProgress);
    const [begunAt] = useState(() => Date.now());
    const [picked, setPicked] = useState<string | null>(null);
    const [currencyFailed, setCurrencyFailed] = useState(false);

    const progress = stored ?? freshProgress(begunAt);
    const currency = picked ?? settings.currency;
    const entered = ledger.books.transactions.some((row) => row.deletedAt === null);
    const screen = shownScreen(screenOf(step), progress.screen, entered);
    const begun = date.day(wallText(progress.begunAt, ledger).slice(0, DAY_LENGTH));

    const show = (next: OnboardingScreen, replace = false) =>
        navigate({ replace, search: (prev) => ({ ...prev, step: next }), to: "/app/onboarding" });
    const go = (next: OnboardingScreen, answers: Partial<OnboardingProgress> = {}) => {
        const reached = stepIndex(next) > stepIndex(progress.screen) ? next : progress.screen;
        writeProgress(userId, { ...progress, ...answers, screen: reached });
        void show(next);
    };
    const finish = () => {
        writeProgress(userId, { ...progress, finished: true });
        void navigate({ replace: true, to: "/app" });
    };

    const saveCurrency = () => {
        const refused = () => {
            setCurrencyFailed(true);
            void show("currency");
        };
        setCurrencyFailed(false);
        if (ledger.books.categories.length === 0) {
            const seeded = committer.commit(seededCategories(labelOf, Date.now()).map((row) => categoryPush(row)));
            void seeded.settled.then((outcome) => (outcome.status === "failed" ? refused() : undefined));
        }
        go("auto-log");
        writeSettings(db, { currency, currencyChosen: "true" }).catch(refused);
    };

    const keepReminder = (reminderMinute: number | null) => {
        const latest = readProgress(userId);
        if (latest) {
            writeProgress(userId, { ...latest, reminderMinute });
        }
    };
    // Asked for from the click that leaves the last step: a browser only shows the prompt to a fresh gesture.
    const remind = async (minute: number) => {
        try {
            const subscription = push?.publicKey ? await subscribePush(push.publicKey) : null;
            if (subscription === null) {
                keepReminder(null);
                return;
            }
            const { auth, p256dh } = subscription.toJSON().keys ?? {};
            await convexClient().mutation(api.webPush.save, {
                auth: auth ?? "",
                dailyMinute: minute,
                endpoint: subscription.endpoint,
                locale: String(locale),
                p256dh: p256dh ?? "",
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
        } catch {
            keepReminder(null);
        }
    };
    // A reminder saved on an earlier pass keeps firing unless the server forgets it too.
    const stopReminding = async (previous: number | null) => {
        try {
            const subscription = await currentPush();
            if (subscription) {
                await convexClient().mutation(api.webPush.remove, { endpoint: subscription.endpoint });
            }
        } catch {
            keepReminder(previous);
        }
    };
    const askToRemind = (minute: number | null) => {
        if (minute !== null && pushAccess() !== "unsupported") {
            void remind(minute);
        }
    };
    const leaveEntry = (settled?: Promise<CommitOutcome>) => {
        go("done");
        askToRemind(progress.reminderMinute);
        void settled?.then((outcome) => {
            if (outcome.status === "failed") {
                flows.toast({ failed: true, text: copy.firstEntry.failed.value });
            }
        });
    };

    switch (screen) {
        case "welcome": {
            return <Welcome begun={begun} onContinue={() => go("currency")} onImport={() => go("import")} />;
        }
        case "import": {
            return <ImportSources onMoneyManager={() => go("money-manager")} onSkip={() => go("currency")} />;
        }
        case "money-manager": {
            return <MoneyManagerSteps onBack={() => go("import")} />;
        }
        case "currency": {
            return (
                <Currency
                    code={currency}
                    failed={currencyFailed}
                    onContinue={saveCurrency}
                    onLeave={finish}
                    onPick={(code) => {
                        setPicked(code);
                        setCurrencyFailed(false);
                    }}
                    onStep={go}
                />
            );
        }
        case "auto-log": {
            return <AutoLog onContinue={() => go("rhythm")} onStep={go} />;
        }
        case "rhythm": {
            return (
                <Rhythm
                    onAnswer={(reminderMinute) => {
                        go(entered ? "done" : "first-entry", { reminderMinute });
                        if (reminderMinute === null) {
                            void stopReminding(progress.reminderMinute);
                        } else if (entered) {
                            askToRemind(reminderMinute);
                        }
                    }}
                    onStep={go}
                    saved={progress.reminderMinute}
                />
            );
        }
        case "first-entry": {
            return <FirstEntry onLater={() => leaveEntry()} onSaved={leaveEntry} onStep={go} />;
        }
        default: {
            return (
                <Done
                    begun={begun}
                    currency={settings.currency}
                    onOpen={finish}
                    onStep={go}
                    reminder={progress.reminderMinute === null ? null : clockTime(clockOf(progress.reminderMinute))}
                />
            );
        }
    }
}
