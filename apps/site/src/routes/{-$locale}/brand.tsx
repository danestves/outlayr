import { localeFromParam } from "@outlayr/shared/i18n";
import { SUPPORT_EMAIL } from "@outlayr/shared/urls";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { screenSources } from "@/components/home/media";
import { Icon } from "@/components/icon";
import { LogoMark } from "@/components/logo-mark";
import { Page } from "@/components/page";
import { proPrices } from "@/lib/pro-prices";
import { ldJson, pageMeta, webPage } from "@/lib/seo";

const SECTION = "py-24";
const HEADING = "text-4xl font-semibold tracking-tight md:text-5xl";
const LABEL = "text-muted font-mono text-xs";
const TILE = "fluid bg-surface hover:bg-foreground/5 flex flex-col gap-4 rounded-3xl p-4 active:scale-[0.98] md:p-6";
const MARKS = [
    { className: "bg-surface text-[#0c0a09]", file: "ink" },
    { className: "bg-[#131209] text-white", file: "white" },
    { className: "bg-surface text-[#c2371b]", file: "vermilion" },
] as const;
const COLORS = [
    { hex: "#0C0A09", id: "ink" },
    { hex: "#FFFFFF", id: "white" },
    { hex: "#C2371B", id: "vermilion" },
    { hex: "#131209", id: "night" },
    { hex: "#00714A", id: "income" },
    { hex: "#C0402E", id: "spend" },
] as const;
const SHOTS = [
    { id: "log", name: "log-an-expense" },
    { id: "budgets", name: "04" },
    { id: "insights", name: "05" },
    { id: "accounts", name: "06" },
    { id: "subscriptions", name: "10" },
] as const;
const MODES = ["light", "dark"] as const;
// The clips open on an empty frame, so each preview seeks to a second where the app is on screen.
const FILMS = [
    { name: "chaos", poster: 3 },
    { name: "capture", poster: 5 },
    { name: "sorted", poster: 3 },
    { name: "month", poster: 5 },
] as const;

export const Route = createFileRoute("/{-$locale}/brand")({
    component: Brand,
    head: ({ params }) => {
        const locale = localeFromParam(params.locale);
        const { meta } = getIntlayer("brand", locale);
        return {
            meta: pageMeta(meta.title, meta.description),
            scripts: [ldJson(webPage(locale, "/brand", { name: meta.title }))],
        };
    },
});

function Brand() {
    const { download, lead, title } = useIntlayer("brand");
    return (
        <Page lead={lead} title={title}>
            <a
                className="fluid bg-foreground text-background mt-10 inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium delay-300 active:scale-[0.98]"
                data-reveal
                download
                href="/brand-kit/outlayr-brand-kit.zip"
            >
                {download}
                <span className="tabular font-mono text-xs opacity-60">ZIP</span>
            </a>
            <Pitch />
            <Claims />
            <Logos />
            <Colors />
            <Screens />
            <Broll />
            <Contact />
        </Page>
    );
}

function Pitch() {
    const { pitch } = useIntlayer("brand");
    return (
        <section className={SECTION}>
            <h2 className={HEADING} data-reveal>
                {pitch.title}
            </h2>
            <ol className="mt-16 grid gap-4 lg:grid-cols-3">
                {pitch.beats.map((beat, index) => (
                    <li
                        className={`bg-surface flex flex-col gap-3 rounded-3xl p-6 md:p-8 ${index === 0 ? "" : "delay-100"}`}
                        data-reveal
                        key={beat.label.value}
                    >
                        <span className={LABEL}>{beat.label}</span>
                        <p className="text-2xl font-semibold tracking-tight text-balance">{beat.say}</p>
                        <p className="text-muted">{beat.show}</p>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function Claims() {
    const { claims } = useIntlayer("brand");
    const prices = proPrices(null, "en");
    const monthly = `${prices.monthly.whole}${prices.monthly.fraction}`;
    return (
        <section className={SECTION}>
            <h2 className={HEADING} data-reveal>
                {claims.title}
            </h2>
            <div className="mt-16 overflow-x-auto" data-reveal>
                <table className="w-full text-left">
                    <thead>
                        <tr className={LABEL}>
                            <th className="border-border border-b pr-6 pb-3 font-normal">{claims.columns.claim}</th>
                            <th className="border-border border-b pb-3 font-normal">{claims.columns.verdict}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <ClaimRow ok verdict={claims.price.verdict}>
                            {claims.price.claim({ monthly, once: prices.once, yearly: prices.yearly })}
                        </ClaimRow>
                        {claims.rows.map((row) => (
                            <ClaimRow key={row.claim.value} ok={row.ok} verdict={row.verdict}>
                                {row.claim}
                            </ClaimRow>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function ClaimRow({ children, ok, verdict }: { children: ReactNode; ok: boolean; verdict: ReactNode }) {
    return (
        <tr className="border-border border-b align-top">
            <td className="py-4 pr-6 md:w-1/2">{children}</td>
            <td className={`py-4 ${ok ? "text-income" : "text-spend"}`}>{verdict}</td>
        </tr>
    );
}

function Logos() {
    const { files } = useIntlayer("brand");
    return (
        <section className={SECTION}>
            <SectionHead lead={files.logoLead} title={files.logo} />
            <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {MARKS.map((mark) => (
                    <li className={`flex flex-col gap-6 rounded-3xl p-6 ${mark.className}`} data-reveal key={mark.file}>
                        <LogoMark className="mx-auto my-6 size-24" />
                        <div className="flex gap-2">
                            <Download href={`/brand-kit/outlayr-mark-${mark.file}.svg`}>SVG</Download>
                            <Download href={`/brand-kit/outlayr-mark-${mark.file}.png`}>PNG 2048</Download>
                        </div>
                    </li>
                ))}
                <li data-reveal>
                    <a className={`${TILE} h-full justify-between`} download href="/brand-kit/outlayr-app-icon.png">
                        <img
                            alt=""
                            className="mx-auto my-2 size-28 rounded-[22%]"
                            height={1024}
                            loading="lazy"
                            src="/brand-kit/outlayr-app-icon.png"
                            width={1024}
                        />
                        <FileLabel detail="PNG 1024 × 1024" label={files.appIcon} />
                    </a>
                </li>
            </ul>
        </section>
    );
}

function Colors() {
    const { colors } = useIntlayer("brand");
    return (
        <section className={SECTION}>
            <SectionHead lead={colors.lead} title={colors.title} />
            <ul className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                {COLORS.map((color) => (
                    <li className="flex flex-col gap-3" data-reveal key={color.id}>
                        <span
                            className="ring-border block h-24 rounded-2xl ring-1 ring-inset"
                            style={{ backgroundColor: color.hex }}
                        />
                        <span>
                            <span className="block text-sm font-semibold">{colors.names[color.id]}</span>
                            <span className={`${LABEL} tabular`}>{color.hex}</span>
                        </span>
                    </li>
                ))}
            </ul>
            <p className="text-muted mt-12 max-w-[65ch]" data-reveal>
                {colors.type}
            </p>
        </section>
    );
}

function Screens() {
    const { files } = useIntlayer("brand");
    const { locale } = useLocale();
    return (
        <section className={SECTION}>
            <SectionHead lead={files.screensLead} title={files.screens} />
            <ul className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                {SHOTS.map((shot) => {
                    const sources = screenSources(shot.name, locale);
                    return (
                        <li className="flex flex-col gap-3" data-reveal key={shot.id}>
                            <img
                                alt=""
                                className="w-full rounded-[15.5%/7.1%]"
                                height={1912}
                                loading="lazy"
                                src={sources.src}
                                width={880}
                            />
                            <span className="text-sm font-semibold">{files.shots[shot.id]}</span>
                            <div className="flex gap-2">
                                <Download href={sources.src}>{files.light}</Download>
                                <Download href={sources.dark}>{files.dark}</Download>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

function Broll() {
    const { files } = useIntlayer("brand");
    return (
        <section className={SECTION}>
            <SectionHead lead={files.brollLead} title={files.broll} />
            <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {FILMS.map(({ name, poster }) => (
                    <li className="bg-surface flex flex-col gap-4 rounded-3xl p-4 md:p-6" data-reveal key={name}>
                        <Preview src={`/brand-kit/broll/${name}-light.mp4#t=${poster}`} />
                        <span className="text-sm font-semibold">{files.clips[name]}</span>
                        <div className="flex gap-2">
                            {MODES.map((mode) => (
                                <Download href={`/brand-kit/broll/${name}-${mode}.mp4`} key={mode}>
                                    {files[mode]}
                                </Download>
                            ))}
                        </div>
                    </li>
                ))}
                <li className="sm:col-span-2 lg:col-span-4" data-reveal>
                    <a
                        className={`${TILE} sm:flex-row sm:items-center`}
                        download
                        href="/brand-kit/broll/promo-dark.mp4"
                    >
                        <FileLabel detail="MP4 1080 × 1920" label={files.clips.promo} />
                    </a>
                </li>
            </ul>
        </section>
    );
}

function Contact() {
    const { contact } = useIntlayer("brand");
    return (
        <section className={SECTION}>
            <div
                className="bg-foreground text-background flex flex-col gap-6 rounded-3xl p-8 md:flex-row md:items-center md:justify-between md:p-12"
                data-reveal
            >
                <div>
                    <p className="font-mono text-xs opacity-70">{contact.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{SUPPORT_EMAIL}</p>
                </div>
                <a
                    className="fluid bg-background text-foreground self-start rounded-full px-5 py-3 text-sm font-medium active:scale-[0.98] md:self-auto"
                    href={`mailto:${SUPPORT_EMAIL}`}
                >
                    {contact.action}
                </a>
            </div>
        </section>
    );
}

function SectionHead({ lead, title }: { lead: ReactNode; title: ReactNode }) {
    return (
        <>
            <h2 className={HEADING} data-reveal>
                {title}
            </h2>
            <p className="text-muted mt-6 max-w-[65ch] text-lg" data-reveal>
                {lead}
            </p>
        </>
    );
}

function Preview({ src }: { src: string }) {
    return (
        <video
            aria-hidden="true"
            className="bg-background aspect-square w-full rounded-2xl"
            muted
            playsInline
            preload="metadata"
            src={src}
        />
    );
}

function Download({ children, href }: { children: ReactNode; href: string }) {
    return (
        <a
            className="fluid rounded-full bg-current/10 px-3 py-1 font-mono text-xs hover:bg-current/20"
            download
            href={href}
        >
            {children}
        </a>
    );
}

function FileLabel({ detail, label }: { detail: string; label: ReactNode }) {
    return (
        <span className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                <span className={`${LABEL} tabular mt-1 block`}>{detail}</span>
            </span>
            <Icon className="text-muted mt-0.5 shrink-0" name="arrow-up-right" />
        </span>
    );
}
