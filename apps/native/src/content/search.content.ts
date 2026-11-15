import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const search = {
    content: {
        "search.empty.idle.body": t({
            en: "Find an entry by its note, category, or amount.",
            de: "Finde einen Eintrag über seine Notiz, Kategorie oder seinen Betrag.",
            es: "Encuentra un registro por su nota, categoría o monto.",
            "es-ES": "Encuentra un registro por su nota, categoría o importe.",
            fr: "Retrouvez une opération par sa note, sa catégorie ou son montant.",
            pt: "Encontre um lançamento pela nota, categoria ou valor.",
            "pt-PT": "Encontre um registo pela nota, categoria ou valor.",
        }),
        "search.empty.idle.title": t({
            en: "Search your ledger",
            de: "Durchsuche deine Einträge",
            es: "Busca en tu registro",
            fr: "Rechercher dans vos opérations",
            pt: "Busque nos seus lançamentos",
            "pt-PT": "Pesquise nos seus registos",
        }),
        "search.empty.noResults.body": t({
            en: "No entry matches “{query}”.",
            de: "Kein Eintrag passt zu „{query}“.",
            es: "Ningún registro coincide con “{query}”.",
            fr: "Aucune opération ne correspond à « {query} ».",
            pt: "Nenhum lançamento corresponde a “{query}”.",
            "pt-PT": "Nenhum registo corresponde a “{query}”.",
        }),
        "search.empty.noResults.title": t({
            en: "No matches",
            de: "Keine Treffer",
            es: "Sin coincidencias",
            fr: "Aucun résultat",
            pt: "Nenhum resultado",
        }),
        "search.placeholder": t({
            en: "Search entry by note",
            de: "Eintrag nach Notiz suchen",
            es: "Buscar registro por nota",
            fr: "Rechercher par note",
            pt: "Buscar lançamento por nota",
            "pt-PT": "Pesquisar registo por nota",
        }),
        "search.results.count_one": t({
            en: "{count} result",
            de: "{count} Ergebnis",
            es: "{count} resultado",
            fr: "{count} résultat",
            pt: "{count} resultado",
        }),
        "search.results.count_other": t({
            en: "{count} results",
            de: "{count} Ergebnisse",
            es: "{count} resultados",
            fr: "{count} résultats",
            pt: "{count} resultados",
        }),
        "search.results.in": t({
            en: "In",
            de: "Eingänge",
            es: "Entró",
            fr: "Entrées",
            pt: "Entrou",
        }),
        "search.results.net": t({
            en: "Net",
            de: "Netto",
            es: "Neto",
            fr: "Net",
            pt: "Líquido",
        }),
        "search.results.out": t({
            en: "Out",
            de: "Ausgänge",
            es: "Salió",
            fr: "Sorties",
            pt: "Saiu",
        }),
    },
    key: "search" as const,
} satisfies Dictionary;

export default search;
