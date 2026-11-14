import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon";
import AppStoreIcon from "@hugeicons/core-free-icons/AppStoreIcon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import InstagramIcon from "@hugeicons/core-free-icons/InstagramIcon";
import Linkedin01Icon from "@hugeicons/core-free-icons/Linkedin01Icon";
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import NewTwitterIcon from "@hugeicons/core-free-icons/NewTwitterIcon";
import RedditIcon from "@hugeicons/core-free-icons/RedditIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import TiktokIcon from "@hugeicons/core-free-icons/TiktokIcon";
import UserMultipleIcon from "@hugeicons/core-free-icons/UserMultipleIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "panelui-web/input";
import { Select } from "panelui-web/select";
import type { Properties } from "posthog-js";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { capture } from "@/lib/analytics";

const ICONS = {
    ai_assistant: AiChat02Icon,
    app_store: AppStoreIcon,
    friend: UserMultipleIcon,
    instagram: InstagramIcon,
    linkedin: Linkedin01Icon,
    other: MoreHorizontalIcon,
    reddit_hn: RedditIcon,
    search: Search01Icon,
    tiktok: TiktokIcon,
    x: NewTwitterIcon,
} as const;

type Source = keyof typeof ICONS;

export interface HeardFrom {
    detail: string;
    source: Source;
}

const LISTED = [
    "search",
    "ai_assistant",
    "app_store",
    "x",
    "instagram",
    "tiktok",
    "linkedin",
    "reddit_hn",
    "friend",
] as const;

const DETAIL_LIMIT = 80;

function shuffled<T>(items: readonly T[]): T[] {
    return items
        .map((item) => ({ item, key: Math.random() }))
        .toSorted((a, b) => a.key - b.key)
        .map(({ item }) => item);
}

export function sendHeardFrom({ detail, source }: HeardFrom) {
    const where = detail.trim();
    const properties: Properties = { $set: { heard_from: source }, source };
    if (source === "other" && where !== "") {
        properties.detail = where;
    }
    capture("heard_from_answered", properties);
}

const sourceIcon = (source: Source) => <HugeiconsIcon className="size-4" icon={ICONS[source]} />;

const ROW = "border-border flex min-h-11 items-center justify-between gap-3 border-t px-4";

export function HeardFromRows({ onChange, value }: { onChange: (next: HeardFrom) => void; value: HeardFrom | null }) {
    const { heardFrom } = useIntlayer("dashboard-onboarding").done;
    const [order] = useState(() => [...shuffled(LISTED), "other" as const]);
    return (
        <>
            <div className={ROW}>
                <dt className="text-muted-foreground text-[13px]">{heardFrom.label}</dt>
                <dd>
                    <Select
                        items={order.map((source) => ({ label: heardFrom.sources[source].value, value: source }))}
                        onValueChange={(next) =>
                            next !== null && onChange({ detail: value?.detail ?? "", source: next })
                        }
                        value={value?.source ?? null}
                    >
                        <Select.Trigger
                            aria-label={heardFrom.label.value}
                            className="w-auto min-w-[160px] gap-2 text-[13px]"
                            icon={<HugeiconsIcon className="size-4" icon={ArrowDown01Icon} />}
                            size="sm"
                        >
                            {value ? sourceIcon(value.source) : null}
                            <Select.Value placeholder={heardFrom.choose.value} />
                        </Select.Trigger>
                        <Select.Content align="end" alignItemWithTrigger={false} className="app-shell z-[60]">
                            {order.map((source) => (
                                <Select.Item icon={sourceIcon(source)} key={source} value={source}>
                                    {heardFrom.sources[source]}
                                </Select.Item>
                            ))}
                        </Select.Content>
                    </Select>
                </dd>
            </div>
            {value?.source === "other" ? (
                <div className={`${ROW} justify-end py-2`}>
                    <Input
                        aria-label={heardFrom.where.value}
                        autoFocus
                        className="h-9 w-full max-w-[376px] text-[13px]"
                        maxLength={DETAIL_LIMIT}
                        onChange={(event) => onChange({ ...value, detail: event.target.value })}
                        placeholder={heardFrom.where.value}
                        value={value.detail}
                    />
                </div>
            ) : null}
        </>
    );
}
