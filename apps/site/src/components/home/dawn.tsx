import { LANGUAGES } from "@outlayr/shared/i18n";
import { useLoaderData } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Icon } from "@/components/icon";
import { LocalizedLink } from "@/components/localized-link";
import { StoreBadges } from "@/components/store-badges";
import { LICENSE, SOURCE_URL } from "@/lib/site";
import { sway } from "@/lib/sway";

import { QrButton } from "./qr-button";
import { HeroPhone } from "./slots/hero-phone";
import { HeroWidget } from "./slots/hero-widget";
import { NewEntryCard } from "./slots/new-entry";
import { TodayCard } from "./slots/today-card";

import "./horizon.css";

const PLACEHOLDER = /(\{\{\w+\}\})/;

const TOKEN = /^\{\{(\w+)\}\}$/;

interface Word {
    id: string;
    text: string;
    index: number;
}

function words(text: string, from: number, prefix: string): Word[] {
    return text.split(" ").map((word, offset) => ({ id: `${prefix}${offset}`, index: from + offset, text: word }));
}

function Rise({ word }: { word: Word }) {
    return (
        <span className="hz-w" style={{ "--i": `${word.index}` }}>
            <span>{word.text}</span>
        </span>
    );
}

function Headline() {
    const { hero } = useIntlayer("home");
    const { hero: copy } = useIntlayer("horizon");
    const title = hero.title.value;
    const mark = copy.mark.value;
    const at = title.lastIndexOf(mark);
    if (at === -1) {
        return (
            <h1 className="hz-headline" id="hero-title">
                {title}
            </h1>
        );
    }
    const lead = words(title.slice(0, at).trim(), 0, "l");
    const marked = words(mark, lead.length, "m");
    return (
        <h1 className="hz-headline" id="hero-title">
            {lead.map((word) => (
                <span key={word.id}>
                    {word.index === lead.length - 1 ? <span className="hz-br" /> : null}
                    <Rise word={word} />{" "}
                </span>
            ))}
            <span className="hz-mark">
                {marked.map((word, offset) => (
                    <span key={word.id}>
                        <Rise word={word} />
                        {offset < marked.length - 1 ? " " : null}
                    </span>
                ))}
            </span>
        </h1>
    );
}

interface WeekProof {
    countries: number;
    entries: number;
    people: number;
}

function fill(template: string, proof: WeekProof, format: Intl.NumberFormat) {
    return template.split(PLACEHOLDER).map((part) => {
        const name = TOKEN.exec(part)?.[1];
        if (name !== "countries" && name !== "entries" && name !== "people") {
            return part;
        }
        return (
            <span className="hz-num" data-count={proof[name]} key={name}>
                {format.format(proof[name])}
            </span>
        );
    });
}

function Proof() {
    const proof = useLoaderData({ from: "/{-$locale}/" })?.week;
    const { hero } = useIntlayer("horizon");
    const { locale } = useLocale();
    if (!proof) {
        return null;
    }
    const format = new Intl.NumberFormat(LANGUAGES[locale].lang);
    return (
        <p className="hz-proof" data-live>
            <LocalizedLink to="/open">{fill(hero.proofLink.value, proof, format)}</LocalizedLink>.{" "}
            {fill(hero.proofRest.value, proof, format)}.
        </p>
    );
}

function Layer({ children, depth, name }: { children: ReactNode; depth: number; name: string }) {
    return (
        <div className={`hz-layer hz-layer-${name}`} data-depth="" style={{ "--depth": `${depth}` }}>
            <div className="hz-rise">{children}</div>
        </div>
    );
}

export function Dawn() {
    const { hero: copy } = useIntlayer("horizon");
    return (
        <div className="hz-dawn">
            <section aria-labelledby="hero-title" className="hz-hero" id="top">
                <div className="hz-intro">
                    <a className="hz-source-line" href={SOURCE_URL}>
                        <Icon name="github-logo" />
                        <span>{copy.source}</span>
                        <span className="hz-source-license">{LICENSE}</span>
                    </a>
                    <Headline />
                    <p className="hz-lead">{copy.lead}</p>
                    <div className="hz-actions">
                        <StoreBadges lead="app-store" placement="hero" />
                        <span aria-hidden="true" className="hz-rule" />
                        <QrButton placement="hero" />
                    </div>
                    <Proof />
                </div>
                <div className="hz-stage" ref={sway}>
                    <div aria-hidden="true" className="hz-layer hz-layer-sun" data-depth="" style={{ "--depth": "5" }}>
                        <div className="hz-drift">
                            <div className="hz-rise">
                                <div className="hz-sun">
                                    <div className="hz-sun-disc" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="hz-stage-inner">
                        <Layer depth={12} name="day">
                            <TodayCard />
                        </Layer>
                        <Layer depth={8} name="phone">
                            <HeroPhone />
                        </Layer>
                        <Layer depth={22} name="widget">
                            <div className="hz-tilt">
                                <HeroWidget />
                            </div>
                        </Layer>
                        <Layer depth={16} name="entry">
                            <NewEntryCard />
                        </Layer>
                    </div>
                </div>
            </section>
            <div aria-hidden="true" className="hz-horizon" />
        </div>
    );
}
