import { useIntlayer } from "react-intlayer";

import { LocalizedLink } from "@/components/localized-link";

const STAGGER_CAP = 5;

export function Faq() {
    const { faq } = useIntlayer("home");
    const { faq: copy } = useIntlayer("horizon");
    const { faqLead, faqSupport, hero } = useIntlayer("story");
    return (
        <section aria-labelledby="faq-title" className="hz-section" id="faq">
            <div className="hz-container hz-faq">
                <div className="hz-faq-head" data-reveal="group">
                    <h2 className="hz-head hz-r" id="faq-title">
                        <span className="hz-lead-in">{copy.lead}</span> {copy.rest}
                    </h2>
                    <p className="hz-definition hz-r" style={{ "--i": "1" }}>
                        {hero.definition}
                    </p>
                    <p className="hz-definition hz-r" style={{ "--i": "2" }}>
                        {faqLead} <LocalizedLink to="/support">{faqSupport}</LocalizedLink>
                    </p>
                </div>
                <div className="hz-faq-list" data-reveal="group">
                    {faq.map((item, index) => (
                        <details
                            className="hz-qa hz-r"
                            key={item.question.value}
                            name="faq"
                            style={{ "--i": `${Math.min(index, STAGGER_CAP)}` }}
                        >
                            <summary>
                                {item.question}
                                <span aria-hidden="true" className="hz-qa-icon" />
                            </summary>
                            <p className="hz-qa-a">{item.answer}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
