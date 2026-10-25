import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const search = {
    content: {
        "search.empty.idle.body": t({
            en: "Find an entry by its note, category, or amount.",
            es: "Encuentra un registro por su nota, categoría o monto.",
            "es-ES": "Encuentra un registro por su nota, categoría o importe.",
            pt: "Encontre um lançamento pela nota, categoria ou valor.",
            "pt-PT": "Encontre um registo pela nota, categoria ou valor.",
        }),
        "search.empty.idle.title": t({
            en: "Search your ledger",
            es: "Busca en tu registro",
            pt: "Busque nos seus lançamentos",
            "pt-PT": "Pesquise nos seus registos",
        }),
        "search.empty.noResults.body": t({
            en: "No entry matches “{query}”.",
            es: "Ningún registro coincide con “{query}”.",
            pt: "Nenhum lançamento corresponde a “{query}”.",
            "pt-PT": "Nenhum registo corresponde a “{query}”.",
        }),
        "search.empty.noResults.title": t({
            en: "No matches",
            es: "Sin coincidencias",
            pt: "Nenhum resultado",
        }),
        "search.placeholder": t({
            en: "Search entry by note",
            es: "Buscar registro por nota",
            pt: "Buscar lançamento por nota",
            "pt-PT": "Pesquisar registo por nota",
        }),
        "search.results.count_one": t({
            en: "{count} result",
            es: "{count} resultado",
            pt: "{count} resultado",
        }),
        "search.results.count_other": t({
            en: "{count} results",
            es: "{count} resultados",
            pt: "{count} resultados",
        }),
        "search.results.in": t({
            en: "In",
            es: "Entró",
            pt: "Entrou",
        }),
        "search.results.net": t({
            en: "Net",
            es: "Neto",
            pt: "Líquido",
        }),
        "search.results.out": t({
            en: "Out",
            es: "Salió",
            pt: "Saiu",
        }),
    },
    key: "search" as const,
} satisfies Dictionary;

export default search;
