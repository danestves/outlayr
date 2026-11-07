import { useIntlayer } from "react-intlayer";

import { SentenceForm } from "@/components/demo/sentence-form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon";
import { CONTAINER } from "@/lib/layout";

import { LazyFilm } from "./films/lazy";
import { HEADING, LABEL } from "./problem";

const FILMS = ["capture", "sorted", "month"] as const;
const WAYS: IconName[] = ["text-aa", "microphone", "receipt", "file-csv"];

export function HowItWorks() {
    const { how } = useIntlayer("story");
    return (
        <section className={`${CONTAINER} scroll-mt-24 py-24`} id="how">
            <div className="max-w-[680px]">
                <p className={LABEL} data-reveal>
                    {how.label}
                </p>
                <h2 className={`${HEADING} mt-4 delay-100`} data-reveal>
                    {how.title}
                </h2>
            </div>
            <ol className="mt-16 flex flex-col gap-24">
                {how.steps.map((step, index) => (
                    <li className="grid gap-8 lg:grid-cols-12 lg:gap-16" key={step.title.value}>
                        <div className="lg:col-span-5">
                            <div className="lg:sticky lg:top-24">
                                <p aria-hidden className="text-tint font-mono text-sm" data-reveal>
                                    {`0${index + 1}`}
                                </p>
                                <h3
                                    className="mt-4 text-3xl font-semibold tracking-tight delay-100 md:text-4xl"
                                    data-reveal
                                >
                                    {step.title}
                                </h3>
                                <p className="text-muted mt-4 text-lg delay-150" data-reveal>
                                    {step.body}
                                </p>
                                {index === 0 ? (
                                    <ul
                                        className="mt-8 grid grid-cols-2 gap-2 text-sm delay-200 sm:grid-cols-4"
                                        data-reveal
                                    >
                                        {how.ways.map((way, wayIndex) => (
                                            <li
                                                className="bg-surface flex items-center gap-2 rounded-xl px-3 py-3"
                                                key={way.value}
                                            >
                                                <Icon className="text-base" name={WAYS[wayIndex] ?? "text-aa"} />
                                                {way}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        </div>
                        <div className="lg:col-span-7" data-reveal>
                            <div className="bg-surface overflow-hidden rounded-3xl">
                                <Scene film={FILMS[index]} label={step.film.value} />
                            </div>
                        </div>
                    </li>
                ))}
            </ol>
            <div className="bg-surface mt-24 rounded-3xl p-6 md:p-12" data-reveal>
                <p className={`${LABEL} mb-8`}>{how.tryIt}</p>
                <SentenceForm />
            </div>
        </section>
    );
}

function Scene({ film, label }: { film: (typeof FILMS)[number] | undefined; label: string }) {
    return film === undefined ? null : <LazyFilm label={label} name={film} />;
}
