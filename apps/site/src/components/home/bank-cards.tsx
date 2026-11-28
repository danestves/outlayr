import { useIntlayer } from "react-intlayer";

import { useMoney } from "@/lib/use-money";

interface ChargeRowProps {
    account: string;
    amount: number;
    i: string;
    logo: string;
    name: string;
    pending?: boolean;
}

function LogoTile({ logo }: { logo: string }) {
    return (
        <span className="hz-bank-logo">
            <img alt="" decoding="async" height="34" loading="lazy" src={`/media/logos/${logo}.webp`} width="34" />
        </span>
    );
}

function ChargeRow({ account, amount, i, logo, name, pending = false }: ChargeRowProps) {
    const { bank } = useIntlayer("horizon");
    const money = useMoney();
    return (
        <div className="hz-bank-row hz-r" style={{ "--i": i }}>
            <LogoTile logo={logo} />
            <span className="hz-bank-who">
                <span className="hz-bank-name">{name}</span>
                <span className="hz-bank-meta">{account}</span>
            </span>
            <span className="hz-bank-money">
                <span className="hz-bank-amount">{money(amount)}</span>
                {pending ? <span className="hz-bank-status">{bank.pending}</span> : null}
            </span>
        </div>
    );
}

export function BankFeed() {
    const { bank } = useIntlayer("horizon");
    const money = useMoney();
    return (
        <div className="hz-bank-feed">
            <div className="hz-bank-feed-head hz-r" style={{ "--i": "0" }}>
                <LogoTile logo="chase.com" />
                <span className="hz-bank-name">Chase ••4417</span>
                <span className="hz-bank-linked">
                    <span aria-hidden="true">✓</span> {bank.linked}
                </span>
            </div>
            <p className="hz-bank-group hz-r" style={{ "--i": "1" }}>
                <span>{bank.today}</span>
                <span className="hz-bank-total">{money(-54.57)}</span>
            </p>
            <ChargeRow account="9:41 AM" amount={-6.45} i="2" logo="starbucks.com" name="Starbucks" pending />
            <ChargeRow account="8:20 AM" amount={-48.12} i="3" logo="target.com" name="Target" />
            <p className="hz-bank-group hz-r" style={{ "--i": "4" }}>
                <span>{bank.yesterday}</span>
                <span className="hz-bank-total">{money(-11.99)}</span>
            </p>
            <ChargeRow account="6:02 AM" amount={-11.99} i="5" logo="spotify.com" name="Spotify" />
        </div>
    );
}

export function BankTip() {
    const { bank } = useIntlayer("horizon");
    const money = useMoney();
    return (
        <div className="hz-bank-tip hz-r" style={{ "--i": "6" }}>
            <div className="hz-bank-tip-card">
                <p className="hz-bank-tip-title">{bank.tipTitle}</p>
                <div className="hz-bank-tip-pair">
                    <span className="hz-bank-tip-side">
                        <span className="hz-bank-status">{bank.pending}</span>
                        <span className="hz-bank-amount">{money(-42)}</span>
                    </span>
                    <span aria-hidden="true" className="hz-bank-tip-arrow">
                        →
                    </span>
                    <span className="hz-bank-tip-side" data-tone="posted">
                        <span className="hz-bank-status">{bank.posted}</span>
                        <span className="hz-bank-amount">{money(-50.4)}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
