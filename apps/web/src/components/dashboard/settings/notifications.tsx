import { convexQuery } from "@convex-dev/react-query";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "panelui-web/alert";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Input } from "panelui-web/input";
import { Radio, RadioGroup } from "panelui-web/radio-group";
import { useToast } from "panelui-web/toast";
import { useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { convexClient } from "@/lib/convex";
import { clockOf } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { currentPush, pushAccess, subscribePush } from "@/lib/web-push";
import type { PushAccess } from "@/lib/web-push";

import { Row, SectionHead, SettingsCard, ToggleRow } from "./parts";

const MORNING = 480;
const EVENING = 1200;
const DEFAULT_CUSTOM = 1290;

const minuteOf = (clock: string) => {
    const [hours = 0, minutes = 0] = clock.split(":").map(Number);
    return hours * 60 + minutes;
};

type Slot = "custom" | "evening" | "morning";
const PUSH_QUERY_KEY = ["web-push", "subscription"];

const slotOf = (minute: number): Slot => {
    if (minute === MORNING) {
        return "morning";
    }
    return minute === EVENING ? "evening" : "custom";
};

function useReminder() {
    const { data: push = null, isPending } = useQuery({
        queryFn: currentPush,
        queryKey: PUSH_QUERY_KEY,
        staleTime: Number.POSITIVE_INFINITY,
    });
    const { data: saved } = useQuery({
        ...convexQuery(api.webPush.mine, push ? { endpoint: push.endpoint } : "skip"),
    });
    return {
        foreign: push !== null && saved === null,
        loading: isPending || (push !== null && saved === undefined),
        push,
        saved: saved ?? null,
    };
}

export function Notifications() {
    const copy = useIntlayer("dashboard-notifications");
    const { sections } = useIntlayer("dashboard-settings");
    const { locale } = useLocale();
    const { clockTime } = useDisplayFormat();
    const toast = useToast();
    const queryClient = useQueryClient();
    const { data: config } = useQuery(convexQuery(api.webPush.config, {}));
    const { foreign, loading, push, saved } = useReminder();
    const [access, setAccess] = useState<PushAccess>(() => (typeof window === "undefined" ? "prompt" : pushAccess()));
    const [draft, setDraft] = useState<number | false | null>(null);
    const [customSlot, setCustomSlot] = useState(false);
    const minute = draft === null ? (saved?.dailyMinute ?? false) : draft;
    const on = minute !== false;
    const slot: Slot = customSlot ? "custom" : slotOf(minute === false ? MORNING : minute);
    const available = access === "allowed" || access === "prompt";
    const time = (at: number) => clockTime(clockOf(at));

    const save = async (next: number) => {
        const previous = draft;
        setDraft(next);
        try {
            const publicKey = config?.publicKey;
            let subscription = foreign ? null : push;
            if (subscription === null && publicKey) {
                await push?.unsubscribe();
                subscription = await subscribePush(publicKey);
            }
            setAccess(pushAccess());
            if (subscription === null) {
                setDraft(previous);
                return;
            }
            const { auth, p256dh } = subscription.toJSON().keys ?? {};
            await convexClient().mutation(api.webPush.save, {
                auth: auth ?? "",
                dailyMinute: next,
                endpoint: subscription.endpoint,
                locale: String(locale),
                p256dh: p256dh ?? "",
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
            queryClient.setQueryData(PUSH_QUERY_KEY, subscription);
        } catch {
            setDraft(previous);
            setAccess(pushAccess());
            toast.add({ title: copy.failed.value, type: "destructive" });
        }
    };

    const turnOff = async () => {
        const previous = draft;
        setDraft(false);
        try {
            if (push) {
                await convexClient().mutation(api.webPush.remove, { endpoint: push.endpoint });
            }
        } catch {
            setDraft(previous);
            toast.add({ title: copy.failed.value, type: "destructive" });
        }
    };

    const pick = (next: Slot) => {
        setCustomSlot(next === "custom");
        const presets = { custom: DEFAULT_CUSTOM, evening: EVENING, morning: MORNING };
        void save(presets[next]);
    };

    if (config && config.publicKey === null) {
        return <SectionHead title={sections.notifications} />;
    }
    return (
        <>
            <SectionHead
                action={
                    <Badge
                        className="max-w-full min-w-0 shrink overflow-hidden"
                        dot
                        variant={available && access === "allowed" ? "success" : "destructive"}
                    >
                        <span className="truncate">{access === "allowed" ? copy.allowed : copy.notAllowed}</span>
                    </Badge>
                }
                title={sections.notifications}
            />
            <div className="@container flex flex-col gap-4 pb-8">
                {access === "blocked" ? (
                    <Alert>
                        <Alert.Title>{copy.offTitle}</Alert.Title>
                        <Alert.Description>{copy.offBody}</Alert.Description>
                        <Alert.Actions>
                            <Button onClick={() => setAccess(pushAccess())} size="sm" variant="outline">
                                {copy.checkAgain}
                            </Button>
                        </Alert.Actions>
                    </Alert>
                ) : null}
                {access === "unsupported" ? (
                    <Alert>
                        <Alert.Title>{copy.unsupportedTitle}</Alert.Title>
                        <Alert.Description>{copy.unsupportedBody}</Alert.Description>
                    </Alert>
                ) : null}
                <div className="grid items-start gap-4 @4xl:grid-cols-2">
                    <SettingsCard
                        footer={
                            <span className="text-muted-foreground">
                                {on && available
                                    ? copy.next({ time: <span className="font-mono">{time(minute)}</span> })
                                    : copy.none}
                            </span>
                        }
                        title={copy.daily}
                    >
                        <div className={available ? undefined : "opacity-50"}>
                            <ToggleRow
                                checked={on && available}
                                disabled={!available || loading}
                                hint={copy.remindHint}
                                label={copy.remind.value}
                                onChange={(next) => (next ? save(minute === false ? MORNING : minute) : turnOff())}
                            />
                        </div>
                        <RadioGroup
                            aria-label={copy.daily.value}
                            className={on && available ? "gap-0" : "gap-0 opacity-50"}
                            disabled={!(on && available)}
                            // SAFETY: every Radio in this group has a Slot value.
                            onValueChange={(next) => pick(next as Slot)}
                            value={on && available ? slot : ""}
                        >
                            <Row
                                hint={copy.morningHint({ time: time(MORNING) })}
                                label={copy.morning}
                                leading={<Radio value="morning" />}
                            />
                            <Row
                                hint={copy.eveningHint({ time: time(EVENING) })}
                                label={copy.evening}
                                leading={<Radio value="evening" />}
                            />
                            <Row label={copy.custom} leading={<Radio value="custom" />}>
                                <Input
                                    aria-label={copy.custom.value}
                                    className="w-[132px]"
                                    disabled={!(on && available && slot === "custom")}
                                    onChange={(event) => {
                                        if (event.target.value) {
                                            void save(minuteOf(event.target.value));
                                        }
                                    }}
                                    type="time"
                                    value={clockOf(slot === "custom" && minute !== false ? minute : DEFAULT_CUSTOM)}
                                />
                            </Row>
                        </RadioGroup>
                    </SettingsCard>
                </div>
            </div>
        </>
    );
}
