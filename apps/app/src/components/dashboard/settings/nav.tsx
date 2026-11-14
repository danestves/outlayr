import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import CheckmarkBadge01Icon from "@hugeicons/core-free-icons/CheckmarkBadge01Icon";
import CloudIcon from "@hugeicons/core-free-icons/CloudIcon";
import DashboardSpeed01Icon from "@hugeicons/core-free-icons/DashboardSpeed01Icon";
import Database01Icon from "@hugeicons/core-free-icons/Database01Icon";
import DollarCircleIcon from "@hugeicons/core-free-icons/DollarCircleIcon";
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon";
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon";
import Notification03Icon from "@hugeicons/core-free-icons/Notification03Icon";
import Plug01Icon from "@hugeicons/core-free-icons/Plug01Icon";
import PreferenceHorizontalIcon from "@hugeicons/core-free-icons/PreferenceHorizontalIcon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon";
import UserIcon from "@hugeicons/core-free-icons/UserIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { pushConfigQuery } from "@/lib/account-state";

const SECTIONS = [
    { icon: UserIcon, key: "account", to: "/settings/account" },
    { icon: CheckmarkBadge01Icon, key: "plan", to: "/settings/plan" },
    { icon: PreferenceHorizontalIcon, key: "preferences", to: "/settings/preferences" },
    { icon: DollarCircleIcon, key: "currency", to: "/settings/currency" },
    { icon: Calendar03Icon, key: "time", to: "/settings/time" },
    { icon: Notification03Icon, key: "notifications", to: "/settings/notifications" },
    { icon: Mail01Icon, key: "email", to: "/settings/email" },
    { icon: CloudIcon, key: "sync", to: "/settings/sync" },
    { icon: DashboardSpeed01Icon, key: "usage", to: "/settings/usage" },
    { icon: UserAdd01Icon, key: "invite", to: "/settings/invite" },
    { icon: Tag01Icon, key: "categories", to: "/settings/categories" },
    { icon: Plug01Icon, key: "connections", to: "/settings/connections" },
    { icon: Database01Icon, key: "data", to: "/settings/data" },
    { icon: InformationCircleIcon, key: "about", to: "/settings/about" },
] as const;

// PanelUI has no sidebar nav part, so the frame's metrics are drawn here.
export function SettingsNav({ list = false }: { list?: boolean }) {
    const { sections } = useIntlayer("dashboard-settings");
    const { data: push } = useQuery(pushConfigQuery);
    return (
        <nav className={list ? "flex flex-col" : "flex flex-col gap-0.5"}>
            {SECTIONS.filter(({ key }) => key !== "notifications" || push?.publicKey !== null).map(
                ({ icon: Icon, key, to }) => {
                    const link = (
                        <Link
                            key={key}
                            activeProps={{ "data-on": "" }}
                            className={
                                list
                                    ? "border-border flex h-12 items-center gap-3 border-b text-[15px]"
                                    : "group text-muted-foreground hover:text-foreground data-on:bg-accent data-on:text-foreground flex h-[34px] items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] font-medium"
                            }
                            to={to}
                        >
                            <HugeiconsIcon
                                icon={Icon}
                                className="text-muted-foreground group-data-on:text-primary size-4 shrink-0"
                            />
                            <span className="min-w-0 flex-1 truncate">{sections[key]}</span>
                            {list ? (
                                <HugeiconsIcon icon={ArrowRight01Icon} className="text-muted-foreground size-[18px]" />
                            ) : null}
                        </Link>
                    );
                    return key === "notifications" && push === undefined ? (
                        <Skeleton key={key} loading>
                            {link}
                        </Skeleton>
                    ) : (
                        link
                    );
                }
            )}
        </nav>
    );
}
