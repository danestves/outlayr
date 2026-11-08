import {
    RiArrowRightSLine,
    RiCalendarLine,
    RiEqualizer2Line,
    RiMoneyDollarCircleLine,
    RiUserLine,
} from "@remixicon/react";
import { Link } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

const SECTIONS = [
    { icon: RiUserLine, key: "account", to: "/app/settings/account" },
    { icon: RiEqualizer2Line, key: "preferences", to: "/app/settings/preferences" },
    { icon: RiMoneyDollarCircleLine, key: "currency", to: "/app/settings/currency" },
    { icon: RiCalendarLine, key: "time", to: "/app/settings/time" },
] as const;

export function SettingsNav({ list = false }: { list?: boolean }) {
    const { sections } = useIntlayer("dashboard-settings");
    return (
        <nav className={list ? "flex flex-col" : "flex flex-col gap-0.5"}>
            {SECTIONS.map(({ icon: Icon, key, to }) => (
                <Link
                    className={
                        list
                            ? "border-border flex h-12 items-center gap-3 border-b text-[15px]"
                            : "dash-nav before:hidden!"
                    }
                    key={key}
                    to={to}
                >
                    <Icon className="text-muted-foreground size-[18px] shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{sections[key]}</span>
                    {list ? <RiArrowRightSLine className="text-muted-foreground size-[18px]" /> : null}
                </Link>
            ))}
        </nav>
    );
}
