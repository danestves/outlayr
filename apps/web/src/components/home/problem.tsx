import { Fragment } from "react";
import type { CSSProperties } from "react";
import { useIntlayer } from "react-intlayer";

import { Icon } from "@/components/icon";
import { CONTAINER } from "@/lib/layout";

import { Film } from "./media";

export const LABEL = "text-muted font-mono text-xs";
export const HEADING = "text-4xl font-semibold tracking-tight md:text-5xl";

const FIELD_WIDTHS = ["w-16", "w-24", "w-20", "w-12", "w-16", "w-24"] as const;
const TAGS = ["amount", "merchant", "category", "account", "date"] as const;

function stagger(index: number): CSSProperties & Record<`--${string}`, string> {
    return { "--delay": `${400 + index * 120}ms` };
}

export function Problem() {
    const { how, problem } = useIntlayer("story");
    const { entry } = useIntlayer("appUi");
    return (
        <section className={`${CONTAINER} scroll-mt-24 py-24`} id="problem">
            <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-5">
                    <p className={LABEL} data-reveal>
                        {problem.label}
                    </p>
                    <h2 className={`${HEADING} mt-4 delay-100`} data-reveal>
                        {problem.title}
                    </h2>
                    <p className="text-muted mt-6 text-lg delay-200" data-reveal>
                        {problem.body}
                    </p>
                </div>
                <div className="lg:col-span-7" data-reveal>
                    <div className="bg-surface overflow-hidden rounded-3xl">
                        <Film label={problem.film.value} name="chaos" />
                    </div>
                </div>
            </div>

            <div className="mt-24 grid gap-8 lg:grid-cols-12 lg:items-end">
                <h3 className={`${HEADING} lg:col-span-7`} data-reveal>
                    {problem.formTitle}
                </h3>
                <p className="text-muted text-lg delay-100 lg:col-span-5" data-reveal>
                    {problem.formBody}
                </p>
            </div>
            <div className="mt-16 grid gap-4 lg:grid-cols-12">
                <div className="bg-surface rounded-3xl p-6 md:p-8 lg:col-span-5" data-reveal>
                    <p className="text-muted text-sm font-medium">{problem.usual}</p>
                    <ul className="mt-6 grid gap-3 text-sm">
                        {problem.fields.map((field, index) => (
                            <li
                                className="bg-raised flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                                key={field.value}
                            >
                                <span className="text-muted">{field}</span>
                                <span className={`bg-border h-2 rounded-full ${FIELD_WIDTHS[index] ?? "w-16"}`} />
                            </li>
                        ))}
                    </ul>
                </div>
                <div
                    className="bg-surface flex flex-col justify-between gap-12 rounded-3xl p-6 delay-150 md:p-8 lg:col-span-7"
                    data-live
                    data-reveal
                >
                    <p className="text-muted text-sm font-medium">{problem.inOutlayr}</p>
                    <p className="flex flex-wrap items-end gap-x-2 gap-y-3 text-3xl font-medium tracking-tight md:text-4xl">
                        {problem.sentence.map((token, index) => {
                            const tag = TAGS.find((name) => name === token.tag.value);
                            const word =
                                tag === undefined ? (
                                    <span className="pb-1">{token.text}</span>
                                ) : (
                                    <span
                                        className="token inline-flex flex-col rounded-lg px-2 pb-1"
                                        style={stagger(index)}
                                    >
                                        <span aria-hidden className="token-tag font-mono text-xs font-normal">
                                            {entry[tag]}
                                        </span>
                                        {token.text}
                                    </span>
                                );
                            return (
                                <Fragment key={`${index}-${token.text.value}`}>
                                    {index > 0 ? " " : null}
                                    {index === problem.sentence.length - 1 ? (
                                        <span className="flex items-end">
                                            {word}
                                            <span className="pb-1">.</span>
                                        </span>
                                    ) : (
                                        word
                                    )}
                                </Fragment>
                            );
                        })}
                    </p>
                    <p className="text-muted flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <span className="flex items-center gap-2">
                            <Icon className="text-base" name="microphone" />
                            {how.ways[1]}
                        </span>{" "}
                        <span className="flex items-center gap-2">
                            <Icon className="text-base" name="receipt" />
                            {how.ways[2]}
                        </span>
                    </p>
                </div>
            </div>
        </section>
    );
}
