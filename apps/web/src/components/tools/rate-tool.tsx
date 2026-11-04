import { useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { FactList } from "@/components/answers/article";
import { convertAtRate, parseAmount } from "@/lib/calculators";
import { LANGUAGES } from "@/lib/i18n";
import { RATE_MARKETS } from "@/lib/rates";
import type { Rate, RateSlug } from "@/lib/rates";

import { AmountInput, Choice, Field, Fields, Figure, ToolPanel } from "./tool-kit";

const MAX_AMOUNT = 100_000_000_000;
const DATE_LENGTH = "2026-11-03".length;
const SERVICE_URL = "https://dolarapi.com";

type From = "local" | "usd";

export function RateTool({ rates, slug }: { rates: readonly Rate[] | null; slug: RateSlug }) {
    const { labels, pages } = useIntlayer("tools");
    const { locale } = useLocale();
    const [amount, setAmount] = useState("1");
    const [from, setFrom] = useState<From>("usd");
    const [kind, setKind] = useState<Rate["kind"]>();
    const { currency, numberLocale, timeZone } = RATE_MARKETS[slug];
    const lang = locale === "es" ? numberLocale : LANGUAGES[locale].lang;
    const dateLang = locale === "es" ? numberLocale : LANGUAGES[locale].date;
    const selected = rates?.find((rate) => rate.kind === kind) ?? rates?.[0];
    const title = pages[slug].title.value;

    if (!rates || !selected) {
        return (
            <ToolPanel answer={labels.rates.unavailable} label={title} tool={slug}>
                {null}
            </ToolPanel>
        );
    }

    const fromCode = from === "usd" ? "USD" : currency;
    const toCode = from === "usd" ? currency : "USD";
    const minor = Math.min(MAX_AMOUNT, parseAmount(amount, fromCode));
    const price = new Intl.NumberFormat(lang, { maximumFractionDigits: 4, minimumFractionDigits: 2 });
    const facts = rates.map((rate) => {
        const when = rate.dateOnly
            ? new Intl.DateTimeFormat(dateLang, { dateStyle: "medium", timeZone: "UTC" }).format(
                  new Date(rate.updatedAt.slice(0, DATE_LENGTH))
              )
            : new Intl.DateTimeFormat(dateLang, {
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  month: "short",
                  timeZone,
                  timeZoneName: "short",
                  year: "numeric",
              }).format(new Date(rate.updatedAt));
        const buy =
            rate.buy === null
                ? ""
                : `${labels.rates.buy.value} ${price.format(rate.buy)} · ${labels.rates.sell.value} `;
        return {
            label: labels.rates.kinds[rate.kind],
            source: { value: rate.source },
            text: { value: `${buy}${price.format(rate.rate)} ${currency} · ${when}` },
        };
    });

    return (
        <>
            <ToolPanel
                answer={labels.rates.result({
                    from: <Figure code={fromCode} lang={lang} minor={minor} />,
                    rate: labels.rates.kinds[selected.kind],
                    to: <Figure code={toCode} lang={lang} minor={convertAtRate(minor, selected.rate, from)} />,
                })}
                label={title}
                tool={slug}
            >
                <Fields className="grid-cols-1 md:grid-cols-3">
                    <Field label={labels.rates.amount}>
                        <AmountInput code={fromCode} onChange={setAmount} value={amount} />
                    </Field>
                    <Field label={labels.rates.convert}>
                        <Choice
                            onChange={setFrom}
                            options={[
                                { label: `USD → ${currency}`, value: "usd" },
                                { label: `${currency} → USD`, value: "local" },
                            ]}
                            value={from}
                        />
                    </Field>
                    <Field label={labels.rates.rate}>
                        <Choice
                            onChange={setKind}
                            options={rates.map((rate) => ({
                                label: labels.rates.kinds[rate.kind].value,
                                value: rate.kind,
                            }))}
                            value={selected.kind}
                        />
                    </Field>
                </Fields>
            </ToolPanel>
            <FactList facts={facts} />
            <p className="text-muted mt-6 font-mono text-xs">
                {labels.rates.source({
                    service: (
                        <a
                            className="fluid hover:text-foreground underline underline-offset-4"
                            href={SERVICE_URL}
                            rel="noopener"
                        >
                            DolarApi.com
                        </a>
                    ),
                })}
            </p>
        </>
    );
}
