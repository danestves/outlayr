import { LANGUAGES } from "@outlayr/shared/i18n";
import { useLoaderData } from "@tanstack/react-router";
import { useIntlayer, useLocale } from "react-intlayer";

import { Icon } from "@/components/icon";
import { LocalizedLink } from "@/components/localized-link";
import { LICENSE, SOURCE_URL } from "@/lib/site";

const CONSENT_PATH = "apps/native/src/lib/posthog-consent.ts";

const [consent = ""] = Object.values(
    import.meta.glob<string>("../../../../native/src/lib/posthog-consent.ts", {
        eager: true,
        import: "default",
        query: "?raw",
    })
);

const LINT_DIRECTIVE = /^\s*\/\/ oxlint-disable/;

const COUNT = "{{count}}";

const consentLines = consent.trimEnd().split("\n");

const lines = consentLines
    .map((text, index) => ({ hot: text.includes("optOut("), number: index + 1, text }))
    .slice(
        Math.max(
            0,
            consentLines.findIndex((line) => line.startsWith("export "))
        )
    )
    .filter(({ text }) => !LINT_DIRECTIVE.test(text));

export function Source() {
    const { source } = useIntlayer("horizon");
    const { locale } = useLocale();
    const merged = useLoaderData({ from: "/{-$locale}/" })?.mergedPrs;
    return (
        <section aria-labelledby="source-title" className="hz-section">
            <div className="hz-container hz-source" data-reveal="group">
                <div>
                    <h2 className="hz-head hz-r" id="source-title">
                        <span className="hz-lead-in">{source.lead}</span> {source.rest}
                    </h2>
                    <p className="hz-line hz-r" style={{ "--i": "1" }}>
                        {source.text}
                    </p>
                    <dl className="hz-source-facts hz-r" style={{ "--i": "2" }}>
                        <div>
                            <dt>{source.license}</dt>
                            <dd>{LICENSE}</dd>
                        </div>
                        <div>
                            <dt>{source.public}</dt>
                            <dd>{source.publicParts}</dd>
                        </div>
                        {merged ? (
                            <div>
                                <dt>{source.merged}</dt>
                                <dd>
                                    {source.mergedCount.value.replace(
                                        COUNT,
                                        new Intl.NumberFormat(LANGUAGES[locale].lang).format(merged)
                                    )}
                                </dd>
                            </div>
                        ) : null}
                    </dl>
                    <div className="hz-source-actions hz-r" style={{ "--i": "3" }}>
                        <a className="hz-source-button" href={SOURCE_URL}>
                            <Icon name="github-logo" />
                            {source.code}
                        </a>
                        <LocalizedLink className="hz-source-link" to="/open">
                            {source.numbers}
                        </LocalizedLink>
                    </div>
                </div>
                <figure className="hz-source-window hz-r" style={{ "--i": "2" }}>
                    <figcaption className="hz-source-bar">
                        <span>{CONSENT_PATH}</span>
                        <a href={`${SOURCE_URL}/blob/main/${CONSENT_PATH}`}>GitHub</a>
                    </figcaption>
                    <pre className="hz-source-code">
                        <code>
                            {lines.map(({ hot, number, text }) => (
                                <span data-hot={hot ? "" : undefined} key={number}>
                                    <span aria-hidden="true" className="hz-source-n">
                                        {number}
                                    </span>
                                    <span>{text}</span>
                                </span>
                            ))}
                        </code>
                    </pre>
                    <p className="hz-source-caption">{source.caption}</p>
                </figure>
            </div>
        </section>
    );
}
