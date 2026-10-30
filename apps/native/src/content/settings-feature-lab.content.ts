import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsFeatureLab = {
    content: {
        "settings.featureLab.addingSection": t({
            en: "Adding a transaction",
            es: "Al agregar una transacción",
            "es-ES": "Al añadir una transacción",
            fr: "Saisie d'une opération",
            pt: "Ao adicionar um lançamento",
            "pt-PT": "Ao adicionar um registo",
        }),
        "settings.featureLab.budgetRows": t({
            en: "Budget rows",
            es: "Filas de presupuesto",
            fr: "Lignes de budget",
            pt: "Orçamentos em linhas",
        }),
        "settings.featureLab.budgetRowsNote": t({
            en: "Off lays the budgets out as a two-up grid instead of a list.",
            es: "Si lo desactivas, los presupuestos se muestran en una cuadrícula de dos en dos en vez de una lista.",
            fr: "Désactivé, les budgets s'affichent en grille sur deux colonnes au lieu d'une liste.",
            pt: "Se desativado, os orçamentos aparecem em uma grade, dois por linha, em vez de uma lista.",
            "pt-PT": "Se desativado, os orçamentos aparecem numa grelha, dois por linha, em vez de uma lista.",
        }),
        "settings.featureLab.budgetsSection": t({
            en: "Budgets",
            es: "Presupuestos",
            fr: "Budgets",
            pt: "Orçamentos",
        }),
        "settings.featureLab.confetti": t({
            en: "Celebrate expenses",
            es: "Celebrar gastos",
            fr: "Fêter les dépenses",
            pt: "Celebrar despesas",
        }),
        "settings.featureLab.confettiNote": t({
            en: "Throws confetti over a transaction the moment you add it.",
            es: "Lanza confeti sobre una transacción en el momento en que la agregas.",
            "es-ES": "Lanza confeti sobre una transacción en el momento en que la añades.",
            fr: "Lance des confettis sur une opération dès que vous l'ajoutez.",
            pt: "Joga confete sobre um lançamento assim que você o adiciona.",
            "pt-PT": "Atira confetti sobre um registo assim que o adiciona.",
        }),
        "settings.featureLab.experimental": t({
            en: "Experimental: these can change or disappear.",
            es: "Experimental: esto puede cambiar o desaparecer.",
            fr: "Expérimental : ces options peuvent changer ou disparaître.",
            pt: "Experimental: isto pode mudar ou desaparecer.",
        }),
        "settings.featureLab.lineGraph": t({
            en: "Show line graph",
            es: "Mostrar gráfico de líneas",
            fr: "Afficher la courbe",
            pt: "Mostrar gráfico de linha",
        }),
        "settings.featureLab.logSection": t({
            en: "The Log",
            es: "El registro",
            fr: "Journal",
            pt: "Lançamentos",
            "pt-PT": "Registos",
        }),
        "settings.featureLab.swapTime": t({
            en: "Replace time label",
            es: "Reemplazar etiqueta de hora",
            fr: "Remplacer l'heure",
            pt: "Trocar o horário pela categoria",
            "pt-PT": "Trocar a hora pela categoria",
        }),
        "settings.featureLab.swapTimeNote": t({
            en: "Each transaction shows its category instead of its time. If you never write your own note, the note is already the category name, so both lines will read the same.",
            es: "Cada transacción muestra su categoría en vez de su hora. Si nunca escribes tu propia nota, la nota ya es el nombre de la categoría, así que ambas líneas dirán lo mismo.",
            fr: "Chaque opération affiche sa catégorie au lieu de son heure. Si vous n'écrivez jamais de note, la note est déjà le nom de la catégorie, et les deux lignes seront identiques.",
            pt: "Cada lançamento mostra a categoria em vez do horário. Se você nunca escreve uma nota própria, a nota já é o nome da categoria, então as duas linhas vão dizer o mesmo.",
            "pt-PT":
                "Cada registo mostra a categoria em vez da hora. Se nunca escreve uma nota própria, a nota já é o nome da categoria, por isso as duas linhas vão dizer o mesmo.",
        }),
        "settings.featureLab.transactionRowsSection": t({
            en: "Transaction rows",
            es: "Filas de transacción",
            fr: "Lignes d'opération",
            pt: "Linhas de lançamento",
            "pt-PT": "Linhas de registo",
        }),
    },
    key: "settings-feature-lab" as const,
} satisfies Dictionary;

export default settingsFeatureLab;
