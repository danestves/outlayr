import { Sheet } from "panelui-web/sheet";
import { useIntlayer } from "react-intlayer";

import { SOURCE_URL } from "@/lib/site";

import { GetAppButton } from "./get-app";
import { LocalizedLink } from "./localized-link";
import { LogoMark } from "./logo-mark";
import type { NavLinks } from "./site-header";

const MENU_LINK = "fluid hover:bg-foreground/5 block rounded-2xl px-3 py-3 text-3xl font-semibold tracking-tight";

export function SiteMenu({
    links,
    onOpenChange,
    open,
}: {
    links: NavLinks;
    onOpenChange: (open: boolean) => void;
    open: boolean;
}) {
    const { getApp, nav } = useIntlayer("site");
    return (
        <Sheet onOpenChange={onOpenChange} open={open} side="top">
            <Sheet.Content className="site-menu" showClose={false} showGrabber={false}>
                <div className="flex items-center justify-between pl-3">
                    <Sheet.Title className="flex items-center gap-2 text-[1.1875rem] font-semibold tracking-[-0.035em]">
                        <LogoMark className="size-7" />
                        Outlayr
                    </Sheet.Title>
                    <Sheet.Close aria-label={nav.close.value} />
                </div>
                <ul className="mt-6 flex flex-col">
                    {links.map((link) => (
                        <li key={link.label.value}>
                            <LocalizedLink
                                className={MENU_LINK}
                                hash={"hash" in link ? link.hash : undefined}
                                onClick={() => onOpenChange(false)}
                                to={link.to}
                            >
                                {link.label}
                            </LocalizedLink>
                        </li>
                    ))}
                    <li>
                        <a className={MENU_LINK} href={SOURCE_URL}>
                            {nav.github}
                        </a>
                    </li>
                </ul>
                <GetAppButton
                    className="bg-foreground text-background hover:not-disabled:bg-foreground/90 mt-6 h-13 w-full text-[1.0625rem]"
                    onDialog={() => onOpenChange(false)}
                    placement="menu"
                >
                    {getApp.title}
                </GetAppButton>
            </Sheet.Content>
        </Sheet>
    );
}
