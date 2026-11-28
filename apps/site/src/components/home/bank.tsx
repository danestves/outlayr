import { useIntlayer } from "react-intlayer";

import { PoweredBy } from "@/components/stripe-wordmark";

import { BankFeed, BankTip } from "./bank-cards";

export function Bank() {
    const { bank } = useIntlayer("horizon");
    return (
        <section aria-labelledby="bank-title" className="hz-section" id="bank">
            <div className="hz-container hz-split">
                <div data-reveal="group">
                    <h2 className="hz-head hz-r" id="bank-title">
                        <span className="hz-lead-in">{bank.lead}</span> {bank.rest}
                    </h2>
                    <p className="hz-line hz-r" style={{ "--i": "1" }}>
                        {bank.body}
                    </p>
                    <dl className="hz-bank-facts hz-r" style={{ "--i": "2" }}>
                        <div className="hz-bank-fact">
                            <dt>{bank.facts.where.label}</dt>
                            <dd>{bank.facts.where.value}</dd>
                        </div>
                        <div className="hz-bank-fact">
                            <dt>{bank.facts.plan.label}</dt>
                            <dd>{bank.facts.plan.value}</dd>
                        </div>
                        <div className="hz-bank-fact">
                            <dt>{bank.facts.login.label}</dt>
                            <dd>{bank.facts.login.value}</dd>
                        </div>
                    </dl>
                    <PoweredBy className="hz-bank-powered hz-r" />
                </div>
                <div aria-hidden="true" className="hz-bank-stage" data-reveal="group">
                    <BankFeed />
                    <BankTip />
                </div>
            </div>
        </section>
    );
}
