import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import BalanceScaleIcon from "@hugeicons/core-free-icons/BalanceScaleIcon";
import GithubIcon from "@hugeicons/core-free-icons/GithubIcon";
import LicenseIcon from "@hugeicons/core-free-icons/LicenseIcon";
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon";
import NewTwitterIcon from "@hugeicons/core-free-icons/NewTwitterIcon";
import Share01Icon from "@hugeicons/core-free-icons/Share01Icon";
import SourceCodeIcon from "@hugeicons/core-free-icons/SourceCodeIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Tabs } from "panelui-web/tabs";
import { useToast } from "panelui-web/toast";
import type { ReactNode } from "react";
import { Suspense, lazy } from "react";
import { useIntlayer } from "react-intlayer";

import { metaFlag, useMeta } from "@/lib/ledger-settings";
import { SITE_URL } from "@/lib/site";

import packageJson from "../../../../../../native/package.json";
import licenses from "../../../../../../native/src/screens/settings/licenses.json";
import { SectionHead, SettingsCard, ToggleRow, useSaveSettings } from "../parts";
import { SuggestButton } from "./suggest";

const LicensesTab = lazy(() => import("./licenses").then((module) => ({ default: module.LicensesTab })));

export const ABOUT_TABS = ["about", "licenses", "lab"] as const;
type AboutTab = (typeof ABOUT_TABS)[number];

const X_PROFILE = "https://x.com/tryoutlayr";
const OUTLAYR_REPO = "https://github.com/danestves/outlayr";
const DIME_REPO = "https://github.com/rafsoh/dimeApp";
const GPL_LINK = "https://www.gnu.org/licenses/gpl-3.0.html";

function Tile({ children }: { children: ReactNode }) {
    return (
        <span className="bg-app-fill text-muted-foreground flex size-[26px] shrink-0 items-center justify-center rounded-lg">
            {children}
        </span>
    );
}

const ROW =
    "border-border hover:bg-accent/40 flex min-h-12 w-full items-center gap-2.5 border-t px-4 text-left text-sm font-medium first:border-t-0";

function ExternalRow({ href, icon, label }: { href: string; icon: ReactNode; label: ReactNode }) {
    return (
        <a className={ROW} href={href} rel="noreferrer" target="_blank">
            <Tile>{icon}</Tile>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <HugeiconsIcon icon={LinkSquare02Icon} className="text-muted-foreground size-4" />
        </a>
    );
}

function ActionRow({ icon, label, onClick }: { icon: ReactNode; label: ReactNode; onClick: () => void }) {
    return (
        <button className={ROW} onClick={onClick} type="button">
            <Tile>{icon}</Tile>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} className="text-muted-foreground size-[18px]" />
        </button>
    );
}

function AboutTabView({ onLicenses }: { onLicenses: () => void }) {
    const copy = useIntlayer("dashboard-about");
    const toast = useToast();
    const share = async () => {
        if (navigator.canShare?.({ url: SITE_URL })) {
            await navigator.share({ url: SITE_URL }).catch(() => undefined);
            return;
        }
        await navigator.clipboard.writeText(SITE_URL);
        toast.add({ title: copy.copied.value });
    };
    return (
        <div className="grid items-start gap-4 @4xl:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-4">
                <SettingsCard
                    action={
                        <span className="text-muted-foreground font-mono text-[13px]">
                            {copy.version({ version: packageJson.version })}
                        </span>
                    }
                    title="Outlayr"
                >
                    <p className="text-muted-foreground px-4 py-3 text-[13px] leading-5">{copy.intro}</p>
                    <div className="border-border border-t">
                        <ActionRow
                            icon={<HugeiconsIcon icon={Share01Icon} size={15} />}
                            label={copy.share}
                            onClick={share}
                        />
                        <ExternalRow
                            href={X_PROFILE}
                            icon={<HugeiconsIcon icon={NewTwitterIcon} size={15} />}
                            label={copy.followX}
                        />
                    </div>
                </SettingsCard>
                <SettingsCard title={copy.licence}>
                    <div className="text-muted-foreground flex flex-col gap-2.5 px-4 py-3 text-[13px] leading-5">
                        <p>{copy.fork}</p>
                        <p>{copy.copyright}</p>
                        <p>{copy.warranty}</p>
                    </div>
                </SettingsCard>
            </div>
            <SettingsCard title={copy.links}>
                <ExternalRow
                    href={OUTLAYR_REPO}
                    icon={<HugeiconsIcon icon={GithubIcon} size={15} />}
                    label={copy.outlayrRepo}
                />
                <ExternalRow
                    href={DIME_REPO}
                    icon={<HugeiconsIcon icon={SourceCodeIcon} size={15} />}
                    label={copy.dimeRepo}
                />
                <ExternalRow
                    href={GPL_LINK}
                    icon={<HugeiconsIcon icon={BalanceScaleIcon} size={15} />}
                    label={copy.gplLink}
                />
                <ActionRow
                    icon={<HugeiconsIcon icon={LicenseIcon} size={15} />}
                    label={copy.licenses}
                    onClick={onLicenses}
                />
            </SettingsCard>
        </div>
    );
}

function LabTab() {
    const about = useIntlayer("dashboard-about");
    const { lab } = useIntlayer("dashboard-settings");
    const meta = useMeta();
    const save = useSaveSettings();
    const toggle = (key: string, fallback: boolean, label: string, hint: ReactNode) => (
        <ToggleRow
            checked={metaFlag(meta, key, fallback)}
            hint={hint}
            label={label}
            onChange={(next) => save({ [key]: String(next) })}
        />
    );
    return (
        <div className="grid items-start gap-4 @4xl:grid-cols-2">
            <SettingsCard title={about.labAdding}>
                {toggle("confetti", false, lab.confetti.value, lab.confettiNote)}
            </SettingsCard>
            <SettingsCard title={about.labBudgets}>
                {toggle("budgetViewStyle", true, lab.budgetRows.value, lab.budgetRowsNote)}
            </SettingsCard>
            <SettingsCard title={about.labLog}>
                {toggle("logViewLineGraph", false, lab.lineGraph.value, lab.experimental)}
            </SettingsCard>
            <SettingsCard title={about.labRows}>
                {toggle("swapTimeLabel", false, lab.swapTime.value, lab.swapTimeNote)}
            </SettingsCard>
        </div>
    );
}

export function AboutSettings() {
    const copy = useIntlayer("dashboard-about");
    const search: { tab?: AboutTab } = useSearch({ strict: false });
    const navigate = useNavigate();
    const tab = search.tab ?? "about";
    const open = (next: AboutTab) =>
        navigate({ replace: true, resetScroll: false, search: { tab: next }, to: "/app/settings/about" });
    return (
        <>
            <SectionHead action={tab === "about" ? <SuggestButton /> : undefined} title={copy.about} />
            <Tabs onValueChange={(next) => open(next)} value={tab} variant="underline">
                <Tabs.List aria-label={copy.about.value}>
                    <Tabs.Trigger value="about">{copy.about}</Tabs.Trigger>
                    <Tabs.Trigger value="licenses">
                        {copy.tabLicenses} <Badge variant="secondary">{licenses.length}</Badge>
                    </Tabs.Trigger>
                    <Tabs.Trigger value="lab">{copy.featureLab}</Tabs.Trigger>
                </Tabs.List>
            </Tabs>
            <div className="pt-4">
                {tab === "about" ? <AboutTabView onLicenses={() => open("licenses")} /> : null}
                {tab === "licenses" ? (
                    <Suspense fallback={null}>
                        <LicensesTab />
                    </Suspense>
                ) : null}
                {tab === "lab" ? <LabTab /> : null}
            </div>
        </>
    );
}
