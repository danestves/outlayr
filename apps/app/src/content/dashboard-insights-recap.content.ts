import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsRecap = {
    content: {
        card: {
            first: insert(
                t({
                    en: "Spent {{amount}} in {{month}}",
                    de: "{{amount}} im {{month}} ausgegeben",
                    es: "Gasté {{amount}} en {{month}}",
                    fr: "Dépensé {{amount}} en {{month}}",
                    pt: "Gastou {{amount}} em {{month}}",
                })
            ),
            firstPlain: insert(
                t({
                    en: "Logged {{month}} with Outlayr",
                    de: "{{month}} mit Outlayr erfasst",
                    es: "Registré {{month}} con Outlayr",
                    fr: "A enregistré {{month}} avec Outlayr",
                    pt: "Registrou {{month}} no Outlayr",
                })
            ),
            less: insert(
                t({
                    en: "Spent {{percent}}% less than {{month}}",
                    de: "{{percent}} % weniger ausgegeben als im {{month}}",
                    es: "Gasté {{percent}}% menos que en {{month}}",
                    fr: "Dépensé {{percent}} % de moins qu'en {{month}}",
                    pt: "Gastou {{percent}}% menos que em {{month}}",
                })
            ),
            more: insert(
                t({
                    en: "Spent {{percent}}% more than {{month}}",
                    de: "{{percent}} % mehr ausgegeben als im {{month}}",
                    es: "Gasté {{percent}}% más que en {{month}}",
                    fr: "Dépensé {{percent}} % de plus qu'en {{month}}",
                    pt: "Gastou {{percent}}% mais que em {{month}}",
                })
            ),
            same: insert(
                t({
                    en: "Spent the same as {{month}}",
                    de: "Genauso viel ausgegeben wie im {{month}}",
                    es: "Gasté lo mismo que en {{month}}",
                    fr: "Dépensé autant qu'en {{month}}",
                    pt: "Gasto igual a {{month}}",
                })
            ),
            days: insert(
                t({
                    en: "{{logged}} of {{total}} days logged",
                    de: "{{logged}} von {{total}} Tagen erfasst",
                    es: "{{logged}} de {{total}} días registrados",
                    fr: "{{logged}} jours enregistrés sur {{total}}",
                    pt: "{{logged}} de {{total}} dias registrados",
                })
            ),
            url: t({
                en: "tryoutlayr.com",
                de: "tryoutlayr.com",
                es: "tryoutlayr.com",
                fr: "tryoutlayr.com",
                pt: "tryoutlayr.com",
            }),
        },
        caught: {
            below: t({
                en: "Below your usual",
                de: "Unter deinem Üblichen",
                es: "Por debajo de lo habitual en",
                fr: "En dessous de votre habitude",
                pt: "Abaixo do seu habitual",
            }),
            belowLine: insert(
                t({
                    en: "Your 3 month average is {{amount}}",
                    de: "Dein 3-Monats-Durchschnitt liegt bei {{amount}}",
                    es: "Tu promedio de 3 meses es {{amount}}",
                    fr: "Votre moyenne sur 3 mois est {{amount}}",
                    pt: "Sua média de 3 meses é {{amount}}",
                })
            ),
            none: t({
                en: "Nothing to count this month. Budgets and a few months of history make this list.",
                de: "Diesen Monat gibt es nichts zu zählen. Budgets und ein paar Monate Verlauf füllen diese Liste.",
                es: "Nada que contar este mes. Los presupuestos y unos meses de historial llenan esta lista.",
                fr: "Rien à compter ce mois-ci. Des budgets et quelques mois d'historique composent cette liste.",
                pt: "Nada para contar neste mês. Orçamentos e alguns meses de histórico formam esta lista.",
            }),
            over: insert(
                t({
                    en: "Over {{count}} of {{total}} budgets",
                    de: "Über {{count}} von {{total}} Budgets",
                    es: "Excediste {{count}} de {{total}} presupuestos",
                    fr: "{{count}} budgets sur {{total}} dépassés",
                    pt: "{{count}} de {{total}} orçamentos acima do limite",
                })
            ),
            overBy: insert(
                t({
                    en: "{{name}} by {{amount}}",
                    de: "{{name}} um {{amount}}",
                    es: "{{name}} por {{amount}}",
                    fr: "{{name}} par {{amount}}",
                    pt: "{{name}} por {{amount}}",
                })
            ),
            pro: t({
                en: "Pro this month",
                de: "Pro diesen Monat",
                es: "Pro este mes",
                fr: "Pro ce mois-ci",
                pt: "Pro neste mês",
            }),
            proLine: insert(
                t({
                    en: "{{kept}} kept against {{cost}} for Pro.",
                    de: "{{kept}} behalten gegenüber {{cost}} für Pro.",
                    es: "{{kept}} ahorrados frente a {{cost}} de Pro.",
                    fr: "{{kept}} épargnés pour {{cost}} du Pro.",
                    pt: "{{kept}} economizados frente a {{cost}} do Pro.",
                })
            ),
            seeBudgets: t({
                en: "See budgets",
                de: "Budgets ansehen",
                es: "Ver presupuestos",
                fr: "Voir les budgets",
                pt: "Ver orçamentos",
            }),
            title: t({
                en: "What Outlayr caught",
                de: "Was Outlayr aufgefallen ist",
                es: "Lo que detectó Outlayr",
                fr: "Ce qu'Outlayr a relevé",
                pt: "O que o Outlayr captou",
            }),
            under: t({
                en: "Under your budgets",
                de: "Unter deinen Budgets",
                es: "Dentro de tus presupuestos",
                fr: "Sous vos budgets",
                pt: "Dentro dos orçamentos",
            }),
            underLine: insert(
                t({
                    en: "{{kept}} of {{total}} budgets kept: {{names}}",
                    de: "{{kept}} von {{total}} Budgets eingehalten: {{names}}",
                    es: "{{kept}} de {{total}} presupuestos cumplidos: {{names}}",
                    fr: "{{kept}} budgets sur {{total}} respectés : {{names}}",
                    pt: "{{kept}} de {{total}} orçamentos mantidos: {{names}}",
                })
            ),
        },
        days: {
            logged: insert(
                t({
                    en: "{{logged}} of {{total}}",
                    de: "{{logged}} von {{total}}",
                    es: "{{logged}} de {{total}}",
                    fr: "{{logged}} sur {{total}}",
                    pt: "{{logged}} de {{total}}",
                })
            ),
            title: t({
                en: "Days logged",
                de: "Erfasste Tage",
                es: "Días registrados",
                fr: "Jours enregistrés",
                pt: "Dias registrados",
            }),
        },
        dialog: {
            amounts: t({
                en: "Show amounts",
                de: "Beträge anzeigen",
                es: "Mostrar montos",
                fr: "Afficher les montants",
                pt: "Mostrar valores",
            }),
            amountsHint: t({
                en: "Off keeps it to percentages.",
                de: "Aus zeigt nur Prozentwerte.",
                es: "Apagado se queda en porcentajes.",
                fr: "Désactivé, cela reste en pourcentages.",
                pt: "Desligado, fica só em porcentagens.",
            }),
            close: t({ en: "Close", de: "Schließen", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
            copied: t({ en: "Copied", de: "Kopiert", es: "Copiada", fr: "Copié", pt: "Copiado" }),
            copy: t({
                en: "Copy image",
                de: "Bild kopieren",
                es: "Copiar imagen",
                fr: "Copier l'image",
                pt: "Copiar imagem",
            }),
            download: t({ en: "Download", de: "Herunterladen", es: "Descargar", fr: "Télécharger", pt: "Baixar" }),
            failed: t({
                en: "The card could not be made.",
                de: "Die Karte konnte nicht erstellt werden.",
                es: "No se pudo crear la tarjeta.",
                fr: "La carte n'a pas pu être créée.",
                pt: "Não foi possível criar o cartão.",
            }),
            note: t({
                en: "Only this card leaves your account. No merchants or accounts.",
                de: "Nur diese Karte verlässt dein Konto. Keine Händler oder Konten.",
                es: "Solo esta tarjeta sale de tu cuenta. Sin comercios ni cuentas.",
                fr: "Seule cette carte quitte votre compte. Aucun commerçant ni compte.",
                pt: "Só este cartão sai da sua conta. Nenhum comerciante ou conta.",
            }),
            preview: t({
                en: "Recap card preview",
                de: "Vorschau der Rückblick-Karte",
                es: "Vista previa de la tarjeta",
                fr: "Aperçu de la carte de récapitulatif",
                pt: "Prévia do cartão de resumo",
            }),
            share: t({ en: "Share", de: "Teilen", es: "Compartir", fr: "Partager", pt: "Compartilhar" }),
            size: t({ en: "Size", de: "Größe", es: "Tamaño", fr: "Taille", pt: "Tamanho" }),
            title: t({
                en: "Share recap",
                de: "Rückblick teilen",
                es: "Compartir resumen",
                fr: "Partager le récapitulatif",
                pt: "Compartilhar resumo",
            }),
        },
        empty: {
            add: t({
                en: "Add entry",
                de: "Eintrag hinzufügen",
                es: "Agregar movimiento",
                fr: "Ajouter une opération",
                pt: "Adicionar lançamento",
            }),
            line: t({
                en: "No savings figure this month. It comes back after a month under your budgets or below your usual spending.",
                de: "Diesen Monat gibt es keinen Sparbetrag. Er kommt wieder, sobald du einen Monat unter deinen Budgets oder unter deinen üblichen Ausgaben bleibst.",
                es: "No hay cifra de ahorro este mes. Vuelve después de un mes dentro de tus presupuestos o por debajo de tu gasto habitual.",
                fr: "Pas de chiffre d'épargne ce mois-ci. Il revient après un mois sous vos budgets ou en dessous de vos dépenses habituelles.",
                pt: "Sem valor de poupança neste mês. Ele volta depois de um mês dentro dos orçamentos ou abaixo do seu gasto habitual.",
            }),
            title: insert(
                t({
                    en: "Nothing logged in {{month}}.",
                    de: "Im {{month}} wurde nichts erfasst.",
                    es: "No registraste nada en {{month}}.",
                    fr: "Rien d'enregistré en {{month}}.",
                    pt: "Nada registrado em {{month}}.",
                })
            ),
        },
        kpi: {
            allDays: t({
                en: "Every day logged",
                de: "Jeden Tag erfasst",
                es: "Todos los días registrados",
                fr: "Chaque jour enregistré",
                pt: "Todo dia registrado",
            }),
            average: insert(
                t({
                    en: "Your 3 month average is {{amount}}",
                    de: "Dein 3-Monats-Durchschnitt liegt bei {{amount}}",
                    es: "Tu promedio de 3 meses es {{amount}}",
                    fr: "Votre moyenne sur 3 mois est {{amount}}",
                    pt: "Sua média de 3 meses é {{amount}}",
                })
            ),
            below: insert(
                t({
                    en: "Below your usual {{name}}",
                    de: "Unter deinem üblichen {{name}}",
                    es: "Por debajo de tu {{name}} habitual",
                    fr: "En dessous de votre habitude pour {{name}}",
                    pt: "Abaixo do seu habitual em {{name}}",
                })
            ),
            belowPlain: t({
                en: "Below your usual",
                de: "Unter deinem Üblichen",
                es: "Por debajo de lo habitual",
                fr: "En dessous de votre habitude",
                pt: "Abaixo do seu habitual",
            }),
            budgetsKept: insert(
                t({
                    en: "{{kept}} of {{total}} budgets kept",
                    de: "{{kept}} von {{total}} Budgets eingehalten",
                    es: "{{kept}} de {{total}} presupuestos cumplidos",
                    fr: "{{kept}} budgets sur {{total}} respectés",
                    pt: "{{kept}} de {{total}} orçamentos mantidos",
                })
            ),
            days: t({
                en: "Days logged",
                de: "Erfasste Tage",
                es: "Días registrados",
                fr: "Jours enregistrés",
                pt: "Dias registrados",
            }),
            daysMissing: insert(
                t({
                    en: "{{count}} days without an entry",
                    de: "{{count}} Tage ohne Eintrag",
                    es: "{{count}} días sin movimientos",
                    fr: "{{count}} jours sans opération",
                    pt: "{{count}} dias sem lançamento",
                })
            ),
            daysOf: insert(
                t({
                    en: "{{logged}} of {{total}}",
                    de: "{{logged}} von {{total}}",
                    es: "{{logged}} de {{total}}",
                    fr: "{{logged}} sur {{total}}",
                    pt: "{{logged}} de {{total}}",
                })
            ),
            noAverage: t({
                en: "No average yet",
                de: "Noch kein Durchschnitt",
                es: "Aún sin promedio",
                fr: "Pas encore de moyenne",
                pt: "Ainda sem média",
            }),
            noBudgets: t({
                en: "No budgets this month",
                de: "Diesen Monat keine Budgets",
                es: "Sin presupuestos este mes",
                fr: "Aucun budget ce mois-ci",
                pt: "Nenhum orçamento neste mês",
            }),
            nothingYet: t({
                en: "Nothing yet",
                de: "Noch nichts",
                es: "Nada aún",
                fr: "Rien pour l'instant",
                pt: "Nada ainda",
            }),
            oneDayMissing: t({
                en: "1 day without an entry",
                de: "1 Tag ohne Eintrag",
                es: "1 día sin movimientos",
                fr: "1 jour sans opération",
                pt: "1 dia sem lançamento",
            }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            under: t({
                en: "Under your budgets",
                de: "Unter deinen Budgets",
                es: "Dentro de tus presupuestos",
                fr: "Sous vos budgets",
                pt: "Dentro dos orçamentos",
            }),
            versus: insert(
                t({
                    en: "vs {{month}}",
                    de: "vs. {{month}}",
                    es: "vs {{month}}",
                    fr: "vs {{month}}",
                    pt: "vs {{month}}",
                })
            ),
        },
        month: {
            next: t({
                en: "Next month",
                de: "Nächster Monat",
                es: "Mes siguiente",
                fr: "Mois prochain",
                pt: "Próximo mês",
            }),
            previous: t({
                en: "Previous month",
                de: "Voriger Monat",
                es: "Mes anterior",
                fr: "Mois précédent",
                pt: "Mês anterior",
            }),
        },
        movers: {
            title: t({ en: "Movers", de: "Veränderungen", es: "Cambios", fr: "Mouvements", pt: "Destaques" }),
        },
        share: insert(
            t({
                en: "Share my {{month}}",
                de: "Meinen {{month}} teilen",
                es: "Compartir mi {{month}}",
                fr: "Partager mon {{month}}",
                pt: "Compartilhar meu {{month}}",
            })
        ),
        where: {
            categories: insert(
                t({
                    en: "{{count}} categories",
                    de: "{{count}} Kategorien",
                    es: "{{count}} categorías",
                    fr: "{{count}} catégories",
                    pt: "{{count}} categorias",
                })
            ),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            ofSpending: t({
                en: "Of spending",
                de: "Von den Ausgaben",
                es: "Del gasto",
                fr: "Des dépenses",
                pt: "Das despesas",
            }),
            share: t({ en: "Share", de: "Anteil", es: "Proporción", fr: "Part", pt: "Proporção" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            title: t({
                en: "Where it went",
                de: "Wohin es ging",
                es: "En qué se fue",
                fr: "Où c'est allé",
                pt: "Para onde foi",
            }),
            versus: insert(
                t({
                    en: "vs {{month}}",
                    de: "vs. {{month}}",
                    es: "vs {{month}}",
                    fr: "vs {{month}}",
                    pt: "vs {{month}}",
                })
            ),
        },
    },
    key: "dashboard-insights-recap",
} satisfies Dictionary;

export default dashboardInsightsRecap;
