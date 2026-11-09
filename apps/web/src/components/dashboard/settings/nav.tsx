import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import CheckmarkBadge01Icon from "@hugeicons/core-free-icons/CheckmarkBadge01Icon";
import DashboardSpeed01Icon from "@hugeicons/core-free-icons/DashboardSpeed01Icon";
import Database01Icon from "@hugeicons/core-free-icons/Database01Icon";
import DollarCircleIcon from "@hugeicons/core-free-icons/DollarCircleIcon";
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon";
import PreferenceHorizontalIcon from "@hugeicons/core-free-icons/PreferenceHorizontalIcon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon";
import UserIcon from "@hugeicons/core-free-icons/UserIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

const SECTIONS = [
    { icon: UserIcon, key: "account", to: "/app/settings/account" },
    { icon: CheckmarkBadge01Icon, key: "plan", to: "/app/settings/plan" },
    { icon: PreferenceHorizontalIcon, key: "preferences", to: "/app/settings/preferences" },
    { icon: DollarCircleIcon, key: "currency", to: "/app/settings/currency" },
    { icon: Calendar03Icon, key: "time", to: "/app/settings/time" },
    { icon: DashboardSpeed01Icon, key: "usage", to: "/app/settings/usage" },
    { icon: UserAdd01Icon, key: "invite", to: "/app/settings/invite" },
    { icon: Tag01Icon, key: "categories", to: "/app/settings/categories" },
    { icon: Database01Icon, key: "data", to: "/app/settings/data" },
    { icon: InformationCircleIcon, key: "about", to: "/app/settings/about" },
] as const;

// PanelUI has no sidebar nav part, so the frame's metrics are drawn here.
export function SettingsNav({ list = false }: { list?: boolean }) {
    const { sections } = useIntlayer("dashboard-settings");
    return (
        <nav className={list ? "flex flex-col" : "flex flex-col gap-0.5"}>
            {SECTIONS.map(({ icon: Icon, key, to }) => (
                <Link
                    activeProps={{ "data-on": "" }}
                    className={
                        list
                            ? "border-border flex h-12 items-center gap-3 border-b text-[15px]"
                            : "group text-muted-foreground hover:text-foreground data-on:bg-accent data-on:text-foreground flex h-[34px] items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] font-medium"
                    }
                    key={key}
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
            ))}
        </nav>
    );
}
