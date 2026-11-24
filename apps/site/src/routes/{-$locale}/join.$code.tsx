import { formatReferralCode, normalizeReferralCode } from "@outlayr/money/contract";
import { capture } from "@outlayr/shared/analytics";
import { localeFromParam } from "@outlayr/shared/i18n";
import { useTimers } from "@outlayr/shared/lifecycle";
import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import { useRef, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { Icon } from "@/components/icon";
import { Page } from "@/components/page";
import { StoreBadges } from "@/components/store-badges";
import { pageMeta } from "@/lib/seo";

const COPIED_MS = 2000;

export const Route = createFileRoute("/{-$locale}/join/$code")({
    component: ProfileJoin,
    loader: ({ params }) => {
        const code = normalizeReferralCode(params.code);
        if (code === null) {
            throw notFound({ routeId: rootRouteId });
        }
        return code;
    },
    head: ({ loaderData, params }) => {
        if (!loaderData) {
            return {};
        }
        const { meta } = getIntlayer("profileJoin", localeFromParam(params.locale));
        return { meta: [...pageMeta(meta.title, meta.description), { content: "noindex", name: "robots" }] };
    },
});

function ProfileJoin() {
    const code = Route.useLoaderData();
    const { code: label, how, lead, open, title } = useIntlayer("profileJoin");
    return (
        <Page lead={lead} title={title}>
            <section className="border-border mt-16 max-w-[680px] border-y py-8 delay-300" data-reveal>
                <p className="text-muted font-mono text-xs">{label}</p>
                <CopyableCode code={code} />
            </section>
            <div className="mt-10 flex flex-col items-start gap-6 delay-300" data-reveal>
                <StoreBadges placement="invite" />
                <a
                    className="fluid bg-surface hover:bg-foreground/5 inline-flex items-center gap-3 rounded-full px-6 py-3 text-base font-semibold active:scale-[0.98]"
                    href={`outlayr://join/${code.toLowerCase()}`}
                    onClick={() => capture("profile_invite_open_clicked")}
                >
                    <Icon name="device-mobile" />
                    {open}
                </a>
            </div>
            <div className="text-muted mt-16 max-w-[680px] space-y-2 delay-300" data-reveal>
                <p>{how}</p>
            </div>
        </Page>
    );
}

function CopyableCode({ code }: { code: string }) {
    const { copied, copy } = useIntlayer("profileJoin");
    const timers = useTimers();
    const [done, setDone] = useState(false);
    const shown = useRef<HTMLParagraphElement>(null);
    const onCopied = () => {
        capture("profile_invite_code_copied");
        setDone(true);
        timers.after(COPIED_MS, () => setDone(false));
    };
    const selectCode = () => {
        if (shown.current) {
            window.getSelection()?.selectAllChildren(shown.current);
        }
    };
    return (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-5xl font-medium tracking-tight tabular-nums md:text-6xl" ref={shown}>
                {formatReferralCode(code)}
            </p>
            <button
                aria-live="polite"
                className="fluid bg-surface hover:bg-foreground/5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold active:scale-[0.98]"
                onClick={() =>
                    navigator.clipboard
                        ? navigator.clipboard.writeText(code).then(onCopied).catch(selectCode)
                        : selectCode()
                }
                type="button"
            >
                <Icon name={done ? "check-circle" : "copy"} />
                {done ? copied : copy}
            </button>
        </div>
    );
}
