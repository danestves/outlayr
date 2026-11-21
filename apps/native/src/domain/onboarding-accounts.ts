import { institutionById, isInstallmentAppAccount } from "@outlayr/money/institution-map";
import * as Schema from "effect/Schema";

import { blocksNewCurrency, FREE_ACCOUNTS } from "@/domain/pro-limits";

export const AccountPick = Schema.Struct({
    currency: Schema.String,
    domain: Schema.NullOr(Schema.String),
    id: Schema.String,
    label: Schema.String,
});

export type AccountPick = typeof AccountPick.Type;

export const CASH_PICK = "cash";

type RegionPick = readonly [id: string, currency?: string];

// Venezuelans keep dollars in Binance and PayPal whatever the home currency is.
const REGION_PICKS = new Map<string, readonly RegionPick[]>([
    ["AR", [["banco-galicia"], ["uala"], ["mercado-pago", "ARS"]]],
    ["BR", [["nubank"], ["itau"], ["bradesco"], ["banco-do-brasil"], ["picpay"], ["mercado-pago", "BRL"]]],
    ["CL", [["banco-de-chile"], ["mercado-pago", "CLP"]]],
    ["CO", [["bancolombia"], ["nequi"], ["daviplata"], ["davivienda"]]],
    ["ES", [["santander"], ["bbva"], ["caixabank"], ["sabadell"], ["revolut"], ["n26"]]],
    ["GB", [["monzo"], ["starling"], ["barclays"], ["hsbc"], ["lloyds"], ["revolut"]]],
    ["MX", [["bbva", "MXN"], ["banorte"], ["banamex"], ["mercado-pago", "MXN"]]],
    ["PE", [["bcp"], ["interbank"]]],
    ["US", [["chase"], ["bank-of-america"], ["wells-fargo"], ["capital-one"], ["venmo"], ["cash-app"]]],
    [
        "VE",
        [
            ["banesco"],
            ["banco-de-venezuela"],
            ["mercantil"],
            ["provincial"],
            ["bnc"],
            ["zelle"],
            ["binance", "USD"],
            ["zinli"],
            ["paypal", "USD"],
        ],
    ],
]);

const ELSEWHERE: readonly RegionPick[] = [["paypal"], ["wise"], ["revolut"]];

export function accountPicksFor(region: string | undefined, home: string, cashLabel: string): AccountPick[] {
    const picks = (region === undefined ? undefined : REGION_PICKS.get(region)) ?? ELSEWHERE;
    return [
        { currency: home, domain: null, id: CASH_PICK, label: cashLabel },
        ...picks.flatMap(([id, currency]) => {
            const institution = institutionById(id);
            return institution === null
                ? []
                : [
                      {
                          currency: currency ?? institution.currency ?? home,
                          domain: institution.domain,
                          id,
                          label: institution.label,
                      },
                  ];
        }),
    ];
}

interface Held {
    readonly currency: string;
    readonly kind: string;
    readonly name: string;
}

/** Picks made now, in order, and the ones Free has no room for, which wait for Pro. */
export function splitByFreeLimits(picks: readonly AccountPick[], held: readonly Held[], locked: boolean) {
    const now: AccountPick[] = [];
    const waiting: AccountPick[] = [];
    const taken: Held[] = [...held];
    for (const pick of picks) {
        const account = { currency: pick.currency, kind: "asset", name: pick.label };
        const counted = taken.filter((other) => !isInstallmentAppAccount(other)).length;
        if (locked && (counted >= FREE_ACCOUNTS || blocksNewCurrency(account, taken, locked))) {
            waiting.push(pick);
        } else {
            now.push(pick);
            taken.push(account);
        }
    }
    return { now, waiting };
}
