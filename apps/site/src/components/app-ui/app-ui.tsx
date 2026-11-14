import type { CSSProperties, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon";

type Size = "lg" | "md";

const SIZE: Record<Size, string> = { lg: "ui ui-lg", md: "ui" };

const STEP = "M0 10V76H13V80H27V84H40V86H53V90H67V93H80V97H93V99H107V104H120V107H133V110H147V113H160";

function Frame({ children, label, size }: { children: ReactNode; label: string; size: Size }) {
    return (
        <div className="ui-wrap h-full">
            <figure aria-label={label} className={SIZE[size]} data-live>
                <div aria-hidden className="contents">
                    {children}
                </div>
            </figure>
        </div>
    );
}

function Logo({ name }: { name: string }) {
    return (
        <span className="ui-logo">
            <img
                alt=""
                className="light-only size-full"
                height={52}
                loading="lazy"
                src={`/media/logos/${name}.webp`}
                width={52}
            />
            <img
                alt=""
                className="dark-only size-full"
                height={52}
                loading="lazy"
                src={`/media/logos/${name}-dark.webp`}
                width={52}
            />
        </span>
    );
}

function delay(index: number, step: number): CSSProperties {
    return { transitionDelay: `${index * step}ms` };
}

function bar(index: number, fill: number): CSSProperties & Record<`--${string}`, number | string> {
    return { "--delay": `${index * 60}ms`, "--fill": fill };
}

export function BudgetCard({ size = "md" }: { size?: Size }) {
    const { budget } = useIntlayer("appUi");
    return (
        <Frame label={budget.label.value} size={size}>
            <div className="ui-row ui-micro">
                <span>{budget.scope}</span>
                <span>{budget.daysLeft}</span>
            </div>
            <p className="ui-amount">
                <span className="ui-cur">$</span>
                <span data-count="1018">1,018</span>
                <span className="ui-cents">.59</span>
            </p>
            <p className="ui-sub">{budget.left}</p>
            <svg aria-hidden="true" className="ui-chart" viewBox="0 0 400 176">
                <path className="ui-area" d={`${STEP}V150H0Z`} />
                <line className="ui-ideal" x1="0" x2="400" y1="10" y2="150" />
                <line className="ui-base" x1="0" x2="400" y1="150" y2="150" />
                <line className="ui-today" x1="160" x2="160" y1="0" y2="174" />
                <path className="ui-step" d={STEP} pathLength={1} />
                <line className="ui-proj" x1="160" x2="400" y1="113" y2="161.5" />
                <circle className="ui-dot" cx="160" cy="113" r="4" />
            </svg>
            <div className="ui-stats">
                <div>
                    <span className="ui-micro">{budget.limit}</span>
                    <b>$3,900</b>
                </div>
                <div>
                    <span className="ui-micro">{budget.spent}</span>
                    <b>$2,881</b>
                </div>
                <div>
                    <span className="ui-micro">{budget.aDay}</span>
                    <b>$57</b>
                </div>
            </div>
        </Frame>
    );
}

const BARS = [0.35, 0.09, 0.58, 0.3, 0.95, 0.42, 0] as const;

export function InsightsCard({ compact = false, size = "md" }: { compact?: boolean; size?: Size }) {
    const { days, insights } = useIntlayer("appUi");
    const movers: { amount: string; icon: IconName; name: ReactNode; pct: ReactNode; tone: string }[] = [
        { amount: "−$1,850.00", icon: "house", name: insights.rent, pct: "−100%", tone: "ui-income" },
        { amount: "+$122.46", icon: "shopping-cart", name: insights.groceries, pct: "+95%", tone: "ui-spend" },
        { amount: "+$112.34", icon: "lightning", name: insights.utilities, pct: insights.fresh, tone: "ui-spend" },
    ];
    return (
        <Frame label={insights.label.value} size={size}>
            <div className="ui-micro">
                {insights.range}
                <span className="ui-chip">−74%</span>
            </div>
            <p className="ui-amount">
                <span className="ui-cur">−$</span>
                <span data-count="597">597</span>
                <span className="ui-cents">.95</span>
            </p>
            <p className="ui-sub">{insights.note}</p>
            <div className="ui-stats ui-stats-2">
                <div>
                    <span className="ui-micro">{insights.income}</span>
                    <b className="ui-income">+$1,450.00</b>
                </div>
                <div>
                    <span className="ui-micro">{insights.net}</span>
                    <b>+$852.05</b>
                </div>
            </div>
            {compact ? null : (
                <>
                    <div className="ui-bars">
                        {BARS.map((fill, index) => (
                            <div className="ui-bar" key={`${days[index]?.value}-${fill}`}>
                                <i style={bar(index, fill)} />
                                <span>{days[index]}</span>
                            </div>
                        ))}
                        <div className="ui-avg">
                            <span>$85</span>
                        </div>
                    </div>
                    <div className="ui-row ui-micro ui-ruled ui-section">
                        <span>{insights.movers}</span>
                        <span>{insights.versus}</span>
                    </div>
                    <ul className="ui-list ui-movers">
                        {movers.map((mover) => (
                            <li key={mover.icon}>
                                <span className="ui-cat">
                                    <Icon name={mover.icon} />
                                </span>
                                <span>{mover.name}</span>
                                <span className={mover.tone}>{mover.amount}</span>
                                <span className="ui-pct">{mover.pct}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Frame>
    );
}

export function UpcomingList({ size = "lg" }: { size?: Size }) {
    const { months, upcoming } = useIntlayer("appUi");
    const rows = [
        { amount: "−$139.00", day: "20", logo: "amazon", month: months.nov, name: "Amazon Prime" },
        { amount: "−$20.00", day: "8", logo: "chatgpt", month: months.oct, name: "ChatGPT" },
        { amount: "−$9.99", day: "6", logo: "icloud", month: months.oct, name: "iCloud" },
        { amount: "−$85.00", day: "5", logo: "verizon", month: months.oct, name: "Verizon" },
        { amount: "−$11.99", day: "3", logo: "spotify", month: months.oct, name: "Spotify" },
        { amount: "−$1,850.00", day: "1", logo: "rent", month: months.oct, name: upcoming.rent },
        { amount: "−$22.99", day: "1", logo: "netflix", month: months.oct, name: "Netflix" },
        { amount: "−$24.99", day: "15", logo: "planet", month: months.sep, name: "Planet Fitness" },
    ];
    return (
        <Frame label={upcoming.label.value} size={size}>
            <div className="ui-row ui-micro ui-ruled">
                <span>{upcoming.title}</span>
                <span>−$2,163.96</span>
            </div>
            <div className="ui-row ui-micro">
                <span>{upcoming.perMonth}</span>
                <span>−$2,036.54</span>
            </div>
            <ul className="ui-list">
                {rows.map((row, index) => (
                    <li className="ui-item" key={row.logo} style={delay(index, 70)}>
                        <Logo name={row.logo} />
                        <span>
                            <span className="ui-name">{row.name}</span>
                            <span className="ui-detail">
                                {row.day} {row.month}
                            </span>
                        </span>
                        <span className="ui-amt">{row.amount}</span>
                    </li>
                ))}
            </ul>
        </Frame>
    );
}

const ACCOUNTS = [
    { amount: "$12,480.32", code: "USD", logo: "chase", name: "Chase" },
    { amount: "$9,450.00", code: "USD", logo: "ally", name: "Ally Savings" },
    { amount: "$3,412.40", code: "USD", logo: "zinli", name: "Zinli" },
    { amount: "Bs.486,000.00", code: "VES", logo: "banesco", name: "Banesco" },
    { amount: "$612.80", code: "USD", logo: "paypal", name: "PayPal" },
    { amount: "−$842.15", code: "USD", logo: "applecard", name: "Apple Card" },
    { amount: "−$1,240.55", code: "USD", logo: "amex", name: "Amex Gold" },
    { amount: "$220.00", code: "USD", logo: "cash", name: null },
] as const;

export function AccountsList({ size = "lg" }: { size?: Size }) {
    const { accounts } = useIntlayer("appUi");
    return (
        <Frame label={accounts.label.value} size={size}>
            <ul className="ui-group">
                {ACCOUNTS.map((account, index) => (
                    <li className="ui-acct ui-item" key={account.logo} style={delay(index, 60)}>
                        <Logo name={account.logo} />
                        <span>
                            <span className="ui-name">{account.name ?? accounts.cash}</span>
                            <span className="ui-detail">{account.code}</span>
                        </span>
                        <span>{account.amount}</span>
                        <Icon className="text-app-muted" name="caret-right" />
                    </li>
                ))}
            </ul>
            <p className="ui-transfer">
                <Icon name="arrows-left-right" />
                {accounts.transfer}
            </p>
        </Frame>
    );
}
