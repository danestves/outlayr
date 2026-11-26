import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsOverview = {
    content: {
        else: {
            allCategories: t({
                en: "All categories",
                de: "Alle Kategorien",
                es: "Todas las categorías",
                fr: "Toutes les catégories",
                pt: "Todas as categorias",
            }),
            byDay: t({ en: "By day", de: "Nach Tag", es: "Por día", fr: "Par jour", pt: "Por dia" }),
            incomeAndNet: t({
                en: "Income and net",
                de: "Einnahmen und Netto",
                es: "Ingresos y neto",
                fr: "Revenus et net",
                pt: "Receitas e líquido",
            }),
            netWorth: t({ en: "Net worth", de: "Vermögen", es: "Patrimonio", fr: "Patrimoine", pt: "Patrimônio" }),
            perDay: insert(
                t({
                    en: "{{amount}} a day",
                    de: "{{amount}} am Tag",
                    es: "{{amount}} al día",
                    fr: "{{amount}} par jour",
                    pt: "{{amount}} por dia",
                })
            ),
            title: t({
                en: "Everything else",
                de: "Alles andere",
                es: "Todo lo demás",
                fr: "Tout le reste",
                pt: "Todo o resto",
            }),
            plan: insert(
                t({
                    en: "Plan {{year}}",
                    de: "Plan {{year}}",
                    es: "Plan {{year}}",
                    fr: "Forfait {{year}}",
                    pt: "Plano {{year}}",
                })
            ),
        },
        history: {
            entries: insert(
                t({
                    en: "{{count}} entries",
                    de: "{{count}} Einträge",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            entry: t({ en: "1 entry", de: "1 Eintrag", es: "1 movimiento", fr: "1 opération", pt: "1 lançamento" }),
            month: t({
                en: "Pace, usual spending and answers start after 3 months.",
                de: "Tempo, übliche Ausgaben und Antworten gibt es nach 3 Monaten.",
                es: "El ritmo, el gasto normal y las respuestas empiezan a los 3 meses.",
                fr: "Le rythme, les dépenses habituelles et les réponses commencent après 3 mois.",
                pt: "Ritmo, gasto habitual e respostas começam depois de 3 meses.",
            }),
            title: t({
                en: "Not enough history",
                de: "Noch nicht genug Verlauf",
                es: "Falta historial",
                fr: "Historique insuffisant",
                pt: "Histórico insuficiente",
            }),
            week: t({
                en: "Pace, usual spending and answers start after 3 weeks.",
                de: "Tempo, übliche Ausgaben und Antworten gibt es nach 3 Wochen.",
                es: "El ritmo, el gasto normal y las respuestas empiezan a las 3 semanas.",
                fr: "Le rythme, les dépenses habituelles et les réponses commencent après 3 semaines.",
                pt: "Ritmo, gasto habitual e respostas começam depois de 3 semanas.",
            }),
            year: t({
                en: "Pace, usual spending and answers start after 3 years.",
                de: "Tempo, übliche Ausgaben und Antworten gibt es nach 3 Jahren.",
                es: "El ritmo, el gasto normal y las respuestas empiezan a los 3 años.",
                fr: "Le rythme, les dépenses habituelles et les réponses commencent après 3 ans.",
                pt: "Ritmo, gasto habitual e respostas começam depois de 3 anos.",
            }),
        },
        kpi: {
            byDay: t({ en: "By day", de: "Nach Tag", es: "Por día", fr: "Par jour", pt: "Por dia" }),
            days: insert(
                t({
                    en: "{{count}} days",
                    de: "{{count}} Tage",
                    es: "{{count}} días",
                    fr: "{{count}} jours",
                    pt: "{{count}} dias",
                })
            ),
            entries: insert(
                t({
                    en: "{{count}} entries",
                    de: "{{count}} Einträge",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            entry: t({ en: "1 entry", de: "1 Eintrag", es: "1 movimiento", fr: "1 opération", pt: "1 lançamento" }),
            first: {
                month: t({
                    en: "Your first month",
                    de: "Dein erster Monat",
                    es: "Tu primer mes",
                    fr: "Votre premier mois",
                    pt: "Seu primeiro mês",
                }),
                week: t({
                    en: "Your first week",
                    de: "Deine erste Woche",
                    es: "Tu primera semana",
                    fr: "Votre première semaine",
                    pt: "Sua primeira semana",
                }),
                year: t({
                    en: "Your first year",
                    de: "Dein erstes Jahr",
                    es: "Tu primer año",
                    fr: "Votre première année",
                    pt: "Seu primeiro ano",
                }),
            },
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos", fr: "Revenus", pt: "Receitas" }),
            kept: t({ en: "Kept", de: "Übrig", es: "Ahorrado", fr: "Épargné", pt: "Guardado" }),
            ofIncome: t({
                en: "of income",
                de: "der Einnahmen",
                es: "del ingreso",
                fr: "des revenus",
                pt: "das receitas",
            }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            versus: insert(
                t({
                    en: "vs {{period}}",
                    de: "vs. {{period}}",
                    es: "vs {{period}}",
                    fr: "vs {{period}}",
                    pt: "vs {{period}}",
                })
            ),
        },
        limit: {
            biggest: insert(
                t({
                    en: "{{spent}} so far. The biggest, {{name}} on {{date}}, was {{amount}}.",
                    de: "{{spent}} bisher. Der größte, {{name}} am {{date}}, waren {{amount}}.",
                    es: "{{spent}} hasta ahora. El mayor, {{name}} el {{date}}, fue de {{amount}}.",
                    fr: "{{spent}} jusqu'ici. La plus grosse, {{name}} le {{date}}, était {{amount}}.",
                    pt: "{{spent}} até agora. A maior, {{name}} em {{date}}, foi {{amount}}.",
                })
            ),
            biggestClosed: insert(
                t({
                    en: "{{spent}} in all. The biggest, {{name}} on {{date}}, was {{amount}}.",
                    de: "{{spent}} insgesamt. Der größte, {{name}} am {{date}}, waren {{amount}}.",
                    es: "{{spent}} en total. El mayor, {{name}} el {{date}}, fue de {{amount}}.",
                    fr: "{{spent}} au total. La plus grosse, {{name}} le {{date}}, était {{amount}}.",
                    pt: "{{spent}} no total. A maior, {{name}} em {{date}}, foi {{amount}}.",
                })
            ),
            biggestUnnamed: insert(
                t({
                    en: "{{spent}} so far. The biggest, on {{date}}, was {{amount}}.",
                    de: "{{spent}} bisher. Der größte, am {{date}}, waren {{amount}}.",
                    es: "{{spent}} hasta ahora. El mayor, el {{date}}, fue de {{amount}}.",
                    fr: "{{spent}} jusqu'ici. La plus grosse, le {{date}}, était {{amount}}.",
                    pt: "{{spent}} até agora. A maior, em {{date}}, foi {{amount}}.",
                })
            ),
            biggestUnnamedClosed: insert(
                t({
                    en: "{{spent}} in all. The biggest, on {{date}}, was {{amount}}.",
                    de: "{{spent}} insgesamt. Der größte, am {{date}}, waren {{amount}}.",
                    es: "{{spent}} en total. El mayor, el {{date}}, fue de {{amount}}.",
                    fr: "{{spent}} au total. La plus grosse, le {{date}}, était {{amount}}.",
                    pt: "{{spent}} no total. A maior, em {{date}}, foi {{amount}}.",
                })
            ),
            chart: insert(
                t({
                    en: "{{category}} by month against its limit",
                    de: "{{category}} pro Monat im Vergleich zum Limit",
                    es: "{{category}} por mes frente a su límite",
                    fr: "{{category}} par mois par rapport à sa limite",
                    pt: "{{category}} por mês frente ao limite",
                })
            ),
            over: t({ en: "Over", de: "Drüber", es: "Excedido", fr: "Au-dessus", pt: "Acima" }),
            statement: insert(
                t({
                    en: "{{category}} passed its {{limit}} limit",
                    de: "{{category}} hat das Limit von {{limit}} überschritten",
                    es: "{{category}} pasó su límite de {{limit}}",
                    fr: "{{category}} a dépassé sa limite de {{limit}}",
                    pt: "{{category}} passou do limite de {{limit}}",
                })
            ),
        },
        pace: {
            asUsual: t({
                en: "You're spending about as usual",
                de: "Du gibst etwa so viel aus wie üblich",
                es: "Estás gastando como de costumbre",
                fr: "Vous dépensez comme d'habitude",
                pt: "Você está gastando como de costume",
            }),
            chart: t({
                en: "Spending added up by day",
                de: "Ausgaben, nach Tagen aufsummiert",
                es: "Gasto acumulado por día",
                fr: "Dépenses cumulées par jour",
                pt: "Despesas somadas por dia",
            }),
            closedAsUsual: t({
                en: "You spent about as usual",
                de: "Du hast etwa so viel ausgegeben wie üblich",
                es: "Gastaste como de costumbre",
                fr: "Vous avez dépensé comme d'habitude",
                pt: "Você gastou como de costume",
            }),
            closedLess: t({
                en: "You spent less than usual",
                de: "Du hast weniger ausgegeben als üblich",
                es: "Gastaste menos de lo normal",
                fr: "Vous avez dépensé moins que d'habitude",
                pt: "Você gastou menos que o habitual",
            }),
            closedLine: insert(
                t({
                    en: "{{amount}} in {{period}}. You usually spend {{usual}}.",
                    de: "{{amount}} in {{period}}. Üblicherweise gibst du {{usual}} aus.",
                    es: "{{amount}} en {{period}}. Normalmente gastas {{usual}}.",
                    fr: "{{amount}} en {{period}}. Vous dépensez habituellement {{usual}}.",
                    pt: "{{amount}} em {{period}}. Você costuma gastar {{usual}}.",
                })
            ),
            closedMore: t({
                en: "You spent more than usual",
                de: "Du hast mehr ausgegeben als üblich",
                es: "Gastaste más de lo normal",
                fr: "Vous avez dépensé plus que d'habitude",
                pt: "Você gastou mais que o habitual",
            }),
            closedPlain: insert(
                t({
                    en: "You spent {{amount}}",
                    de: "Du hast {{amount}} ausgegeben",
                    es: "Gastaste {{amount}}",
                    fr: "Vous avez dépensé {{amount}}",
                    pt: "Você gastou {{amount}}",
                })
            ),
            course: insert(
                t({
                    en: "You're on course to end near {{amount}}. You usually spend {{usual}} by now.",
                    de: "Du landest voraussichtlich bei etwa {{amount}}. Üblicherweise gibst du bis jetzt {{usual}} aus.",
                    es: "Vas camino a cerrar cerca de {{amount}}. A esta altura normalmente gastas {{usual}}.",
                    fr: "Vous êtes en voie de terminer près de {{amount}}. Vous dépensez habituellement {{usual}} à ce stade.",
                    pt: "Você está no ritmo de terminar perto de {{amount}}. Normalmente gasta {{usual}} até agora.",
                })
            ),
            faster: t({
                en: "You're spending faster than usual",
                de: "Du gibst schneller aus als üblich",
                es: "Estás gastando más rápido de lo normal",
                fr: "Vous dépensez plus vite que d'habitude",
                pt: "Você está gastando mais rápido que o habitual",
            }),
            noUsual: t({
                en: "No usual to compare with yet.",
                de: "Noch kein üblicher Wert zum Vergleichen.",
                es: "Aún no hay un gasto normal con qué comparar.",
                fr: "Pas encore d'habitude à comparer.",
                pt: "Ainda não há habitual para comparar.",
            }),
            nothing: t({
                en: "Nothing spent yet",
                de: "Noch nichts ausgegeben",
                es: "Aún no hay gastos",
                fr: "Aucune dépense pour l'instant",
                pt: "Nada gasto ainda",
            }),
            plain: insert(
                t({
                    en: "You've spent {{amount}} so far",
                    de: "Du hast bisher {{amount}} ausgegeben",
                    es: "Has gastado {{amount}} hasta ahora",
                    fr: "Vous avez dépensé {{amount}} jusqu'ici",
                    pt: "Você gastou {{amount}} até agora",
                })
            ),
            slower: t({
                en: "You're spending slower than usual",
                de: "Du gibst langsamer aus als üblich",
                es: "Estás gastando más lento de lo normal",
                fr: "Vous dépensez plus lentement que d'habitude",
                pt: "Você está gastando mais devagar que o habitual",
            }),
            today: insert(
                t({
                    en: "Today {{amount}}",
                    de: "Heute {{amount}}",
                    es: "Hoy {{amount}}",
                    fr: "Aujourd'hui {{amount}}",
                    pt: "Hoje {{amount}}",
                })
            ),
            usual: t({ en: "Usual", de: "Üblich", es: "Lo normal", fr: "Habituel", pt: "Habitual" }),
        },
        quiet: {
            line: t({
                en: "Every category is close to where it usually is.",
                de: "Jede Kategorie liegt nah an ihrem üblichen Wert.",
                es: "Cada categoría está cerca de lo normal.",
                fr: "Chaque catégorie est proche de son niveau habituel.",
                pt: "Cada categoria está perto do habitual.",
            }),
            title: t({
                en: "Nothing stands out",
                de: "Nichts fällt auf",
                es: "Nada destaca",
                fr: "Rien ne ressort",
                pt: "Nada se destaca",
            }),
        },
        sample: {
            badge: t({ en: "Sample", de: "Beispiel", es: "Ejemplo", fr: "Exemple", pt: "Exemplo" }),
            categories: {
                dining: t({
                    en: "Dining Out",
                    de: "Essengehen",
                    es: "Restaurantes",
                    fr: "Restaurants",
                    pt: "Restaurantes",
                }),
                groceries: t({ en: "Groceries", de: "Lebensmittel", es: "Mercado", fr: "Courses", pt: "Mercado" }),
                rent: t({ en: "Rent", de: "Miete", es: "Alquiler", fr: "Loyer", pt: "Aluguel" }),
                shopping: t({ en: "Shopping", de: "Shopping", es: "Compras", fr: "Achats", pt: "Compras" }),
                subscriptions: t({
                    en: "Subscriptions",
                    de: "Abos",
                    es: "Suscripciones",
                    fr: "Abonnements",
                    pt: "Assinaturas",
                }),
                transport: t({ en: "Transport", de: "Mobilität", es: "Transporte", fr: "Transport", pt: "Transporte" }),
            },
            cta: t({
                en: "Log your first expense",
                de: "Erfasse deine erste Ausgabe",
                es: "Registra tu primer gasto",
                fr: "Enregistrez votre première dépense",
                pt: "Registre sua primeira despesa",
            }),
            gaveBack: insert(
                t({
                    en: "{{category}} alone gave back {{amount}}.",
                    de: "Allein {{category}} brachte {{amount}} zurück.",
                    es: "Solo {{category}} devolvió {{amount}}.",
                    fr: "Seul {{category}} a rendu {{amount}}.",
                    pt: "Só {{category}} devolveu {{amount}}.",
                })
            ),
            less: insert(
                t({
                    en: "{{amount}} less than {{period}}",
                    de: "{{amount}} weniger als {{period}}",
                    es: "{{amount}} menos que en {{period}}",
                    fr: "{{amount}} de moins que {{period}}",
                    pt: "{{amount}} menos que {{period}}",
                })
            ),
            line: t({
                en: "Yours starts filling in from your first entry.",
                de: "Deiner füllt sich ab deinem ersten Eintrag.",
                es: "El tuyo empieza a llenarse con tu primer movimiento.",
                fr: "Le vôtre commence à se remplir dès votre première opération.",
                pt: "O seu começa a se preencher com o primeiro lançamento.",
            }),
            title: t({
                en: "This is what a month looks like",
                de: "So sieht ein Monat aus",
                es: "Así se ve un mes",
                fr: "Voici à quoi ressemble un mois",
                pt: "É assim que um mês se parece",
            }),
        },
        see: insert(
            t({
                en: "See {{category}}",
                de: "{{category}} ansehen",
                es: "Ver {{category}}",
                fr: "Voir {{category}}",
                pt: "Ver {{category}}",
            })
        ),
        subscriptions: {
            foot: insert(
                t({
                    en: "{{amount}} a year. Next charge: {{name}} on {{date}}.",
                    de: "{{amount}} im Jahr. Nächste Abbuchung: {{name}} am {{date}}.",
                    es: "{{amount}} al año. Próximo cobro: {{name}} el {{date}}.",
                    fr: "{{amount}} par an. Prochain prélèvement : {{name}} le {{date}}.",
                    pt: "{{amount}} por ano. Próxima cobrança: {{name}} em {{date}}.",
                })
            ),
            one: insert(
                t({
                    en: "1 subscription costs you {{amount}} a month",
                    de: "1 Abo kostet dich {{amount}} im Monat",
                    es: "1 suscripción te cuesta {{amount}} al mes",
                    fr: "1 abonnement vous coûte {{amount}} par mois",
                    pt: "1 assinatura custa {{amount}} por mês",
                })
            ),
            seeAll: t({ en: "See all", de: "Alle anzeigen", es: "Ver todas", fr: "Tout voir", pt: "Ver todos" }),
            statement: insert(
                t({
                    en: "{{count}} subscriptions cost you {{amount}} a month",
                    de: "{{count}} Abos kosten dich {{amount}} im Monat",
                    es: "{{count}} suscripciones te cuestan {{amount}} al mes",
                    fr: "{{count}} abonnements vous coûtent {{amount}} par mois",
                    pt: "{{count}} assinaturas custam {{amount}} por mês",
                })
            ),
        },
        versus: {
            above: t({ en: "Above", de: "Darüber", es: "Por encima", fr: "Au-dessus", pt: "Acima" }),
            below: t({ en: "Below", de: "Darunter", es: "Por debajo", fr: "En dessous", pt: "Abaixo" }),
            closedOver: insert(
                t({
                    en: "{{category}} ended {{amount}} over its usual",
                    de: "{{category}} lag am Ende {{amount}} über dem üblichen Wert",
                    es: "{{category}} cerró {{amount}} por encima de lo normal",
                    fr: "{{category}} a terminé {{amount}} au-dessus de son habitude",
                    pt: "{{category}} terminou {{amount}} acima do habitual",
                })
            ),
            closedUnder: insert(
                t({
                    en: "{{category}} ended {{amount}} under its usual",
                    de: "{{category}} lag am Ende {{amount}} unter dem üblichen Wert",
                    es: "{{category}} cerró {{amount}} por debajo de lo normal",
                    fr: "{{category}} a terminé {{amount}} en dessous de son habitude",
                    pt: "{{category}} terminou {{amount}} abaixo do habitual",
                })
            ),
            over: insert(
                t({
                    en: "{{category}} is {{amount}} over where you usually are by now",
                    de: "{{category}} liegt {{amount}} über deinem üblichen Stand zu diesem Zeitpunkt",
                    es: "{{category}} va {{amount}} por encima de lo normal a esta altura",
                    fr: "{{category}} est {{amount}} au-dessus de votre niveau habituel à ce stade",
                    pt: "{{category}} está {{amount}} acima de onde você costuma estar até agora",
                })
            ),
            under: insert(
                t({
                    en: "{{category}} is {{amount}} under where you usually are by now",
                    de: "{{category}} liegt {{amount}} unter deinem üblichen Stand zu diesem Zeitpunkt",
                    es: "{{category}} va {{amount}} por debajo de lo normal a esta altura",
                    fr: "{{category}} est {{amount}} en dessous de votre niveau habituel à ce stade",
                    pt: "{{category}} está {{amount}} abaixo de onde você costuma estar até agora",
                })
            ),
            usual: t({ en: "Usual", de: "Üblich", es: "Lo normal", fr: "Habituel", pt: "Habitual" }),
            usualBy: insert(
                t({
                    en: "Usual by {{date}}",
                    de: "Üblich bis {{date}}",
                    es: "Lo normal al {{date}}",
                    fr: "Habituel au {{date}}",
                    pt: "Habitual até {{date}}",
                })
            ),
        },
        where: {
            breakdown: t({
                en: "Breakdown",
                de: "Aufschlüsselung",
                es: "Desglose",
                fr: "Répartition",
                pt: "Detalhamento",
            }),
            title: t({
                en: "Where it went",
                de: "Wohin es ging",
                es: "En qué se fue",
                fr: "Où c'est allé",
                pt: "Para onde foi",
            }),
        },
    },
    key: "dashboard-insights-overview",
} satisfies Dictionary;

export default dashboardInsightsOverview;
