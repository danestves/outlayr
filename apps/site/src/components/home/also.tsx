import { useIntlayer } from "react-intlayer";

import { SOURCE_URL } from "@/lib/site";

import { AppearanceRow } from "./slots/appearance";

const GITHUB = "{{github}}";

export function Also() {
    const { also } = useIntlayer("horizon");
    const [before, after = ""] = also.openSource.text.value.split(GITHUB);
    return (
        <section aria-labelledby="also-title" className="hz-section">
            <div className="hz-container" data-reveal="group">
                <h2 className="hz-head hz-r" id="also-title">
                    <span className="hz-lead-in">{also.lead}</span> {also.rest}
                </h2>
                <div className="hz-also-grid">
                    <div className="hz-look hz-r" style={{ "--i": "1" }}>
                        <div aria-hidden="true" className="hz-look-row">
                            <div className="hz-look-night">
                                <AppearanceRow theme="dark" />
                            </div>
                            <div className="hz-look-day">
                                <AppearanceRow theme="light" />
                            </div>
                        </div>
                        <div className="hz-look-foot">
                            <h3 className="hz-look-label">{also.appearance.label}</h3>
                            <p className="hz-look-line">{also.appearance.text}</p>
                            <div aria-label={also.appearance.label.value} className="hz-look-switch" role="radiogroup">
                                <span aria-hidden="true" className="hz-look-thumb" />
                                <label>
                                    <input defaultChecked name="look" type="radio" value="dark" />
                                    {also.look.dark}
                                </label>
                                <label>
                                    <input name="look" type="radio" value="light" />
                                    {also.look.light}
                                </label>
                            </div>
                        </div>
                    </div>
                    <dl className="hz-facts hz-r" style={{ "--i": "2" }}>
                        {also.facts.map((fact) => (
                            <div className="hz-fact" key={fact.label.value}>
                                <dt>{fact.label}</dt>
                                <dd>{fact.text}</dd>
                            </div>
                        ))}
                        <div className="hz-fact">
                            <dt>{also.openSource.label}</dt>
                            <dd>
                                {before}
                                <a href={SOURCE_URL}>GitHub</a>
                                {after}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </section>
    );
}
