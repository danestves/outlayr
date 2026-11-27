import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsights = {
    content: {
        budget: {
            none: t({
                en: "No budget",
                de: "Kein Budget",
                es: "Sin límite",
                fr: "Sans budget",
                pt: "Sem orçamento",
                it: "Nessun budget",
                nl: "Geen budget",
                ja: "予算なし",
                ko: "예산 없음",
            }),
        },
        cashFlow: {
            savings: t({
                en: "Savings",
                de: "Gespart",
                es: "Ahorros",
                fr: "Épargne",
                pt: "Poupança",
                it: "Risparmi",
                nl: "Spaargeld",
                ja: "貯金",
                ko: "저축",
            }),
            title: t({
                en: "Cash flow",
                de: "Cashflow",
                es: "Flujo de caja",
                fr: "Flux de trésorerie",
                pt: "Fluxo de caixa",
                it: "Flusso di cassa",
                nl: "Kasstroom",
                ja: "キャッシュフロー",
                ko: "현금 흐름",
            }),
        },
        changes: {
            empty: t({
                en: "Not enough history to compare yet.",
                de: "Noch nicht genug Verlauf zum Vergleichen.",
                es: "Aún no hay historial suficiente para comparar.",

                fr: "Pas assez d'historique pour comparer.",
                pt: "Histórico insuficiente para comparar ainda.",
                it: "Non c'è ancora abbastanza cronologia per fare un confronto.",
                nl: "Nog niet genoeg geschiedenis om te vergelijken.",
                ja: "比較するための履歴がまだ足りません。",
                ko: "비교할 만큼 내역이 아직 충분하지 않아요.",
            }),
            other: t({
                en: "Other",
                de: "Sonstige",
                es: "Otros",
                fr: "Autre",
                pt: "Outro",
                it: "Altro",
                nl: "Overig",
                ja: "その他",
                ko: "기타",
            }),
            title: insert(
                t({
                    en: "{{period}} against usual",
                    de: "{{period}} im Vergleich zum Üblichen",
                    es: "{{period}} frente a lo normal",

                    fr: "{{period}} par rapport à l'habitude",
                    pt: "{{period}} frente ao habitual",
                    it: "{{period}} rispetto al solito",
                    nl: "{{period}} t.o.v. gebruikelijk",
                    ja: "{{period}}と普段の比較",
                    ko: "{{period}} 대비 평소",
                })
            ),
            usual: t({
                en: "Usual",
                de: "Üblich",
                es: "Lo normal",
                fr: "Habituel",
                pt: "Habitual",
                it: "Solito",
                nl: "Gebruikelijk",
                ja: "普段",
                ko: "평소",
            }),
        },
        empty: {
            cashFlow: t({
                en: "Nothing came in or went out.",
                de: "Es ist nichts reingekommen oder rausgegangen.",
                es: "No entró ni salió dinero.",

                fr: "Rien n'est entré ni sorti.",
                pt: "Nada entrou ou saiu.",
                it: "Non è entrato né uscito nulla.",
                nl: "Er is niets binnengekomen of uitgegaan.",
                ja: "収入も支出もありませんでした。",
                ko: "들어오거나 나간 돈이 없어요.",
            }),
            spending: t({
                en: "No spending in this period.",
                de: "In diesem Zeitraum keine Ausgaben.",
                es: "Sin gastos en este periodo.",

                fr: "Aucune dépense sur cette période.",
                pt: "Sem gastos neste período.",
                it: "Nessuna spesa in questo periodo.",
                nl: "Geen uitgaven in deze periode.",
                ja: "この期間の支出はありません。",
                ko: "이 기간에는 지출이 없어요.",
            }),
        },
        headline: {
            asUsual: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, about as usual.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben, etwa wie üblich.",
                    es: "Gastaste {{amount}} en {{period}}, como de costumbre.",

                    fr: "Vous avez dépensé {{amount}} en {{period}}, comme d'habitude.",
                    pt: "Você gastou {{amount}} em {{period}}, como de costume.",
                    "pt-PT": "Gastou {{amount}} em {{period}}, como de costume.",
                    it: "Hai speso {{amount}} in {{period}}, più o meno come al solito.",
                    nl: "Je gaf {{amount}} uit in {{period}}, ongeveer zoals gebruikelijk.",
                    ja: "{{period}}の支出は{{amount}}で、普段とほぼ同じです。",
                    ko: "{{period}}에 {{amount}}을 썼어요. 평소와 비슷해요.",
                })
            ),
            less: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, {{percent}}% less than usual.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben, {{percent}} % weniger als üblich.",
                    es: "Gastaste {{amount}} en {{period}}, un {{percent}}% menos de lo normal.",

                    fr: "Vous avez dépensé {{amount}} en {{period}}, {{percent}} % de moins que d'habitude.",
                    pt: "Você gastou {{amount}} em {{period}}, {{percent}}% menos que o habitual.",
                    "pt-PT": "Gastou {{amount}} em {{period}}, {{percent}}% menos que o habitual.",
                    it: "Hai speso {{amount}} in {{period}}, il {{percent}}% in meno del solito.",
                    nl: "Je gaf {{amount}} uit in {{period}}, {{percent}}% minder dan gebruikelijk.",
                    ja: "{{period}}の支出は{{amount}}で、普段より{{percent}}%少なくなりました。",
                    ko: "{{period}}에 {{amount}}을 썼어요. 평소보다 {{percent}}% 적어요.",
                })
            ),
            more: insert(
                t({
                    en: "You spent {{amount}} in {{period}}, {{percent}}% more than usual.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben, {{percent}} % mehr als üblich.",
                    es: "Gastaste {{amount}} en {{period}}, un {{percent}}% más de lo normal.",

                    fr: "Vous avez dépensé {{amount}} en {{period}}, {{percent}} % de plus que d'habitude.",
                    pt: "Você gastou {{amount}} em {{period}}, {{percent}}% mais que o habitual.",
                    "pt-PT": "Gastou {{amount}} em {{period}}, {{percent}}% mais que o habitual.",
                    it: "Hai speso {{amount}} in {{period}}, il {{percent}}% in più del solito.",
                    nl: "Je gaf {{amount}} uit in {{period}}, {{percent}}% meer dan gebruikelijk.",
                    ja: "{{period}}の支出は{{amount}}で、普段より{{percent}}%多くなりました。",
                    ko: "{{period}}에 {{amount}}을 썼어요. 평소보다 {{percent}}% 많아요.",
                })
            ),
            nothing: insert(
                t({
                    en: "You spent nothing in {{period}}.",
                    de: "Du hast in {{period}} nichts ausgegeben.",
                    es: "No gastaste nada en {{period}}.",

                    fr: "Vous n'avez rien dépensé en {{period}}.",
                    pt: "Você não gastou nada em {{period}}.",
                    "pt-PT": "Não gastou nada em {{period}}.",
                    it: "Non hai speso nulla in {{period}}.",
                    nl: "Je gaf niets uit in {{period}}.",
                    ja: "{{period}}の支出はありませんでした。",
                    ko: "{{period}}에는 지출이 없었어요.",
                })
            ),
            plain: insert(
                t({
                    en: "You spent {{amount}} in {{period}}.",
                    de: "Du hast in {{period}} {{amount}} ausgegeben.",
                    es: "Gastaste {{amount}} en {{period}}.",

                    fr: "Vous avez dépensé {{amount}} en {{period}}.",
                    pt: "Você gastou {{amount}} em {{period}}.",
                    "pt-PT": "Gastou {{amount}} em {{period}}.",
                    it: "Hai speso {{amount}} in {{period}}.",
                    nl: "Je gaf {{amount}} uit in {{period}}.",
                    ja: "{{period}}の支出は{{amount}}です。",
                    ko: "{{period}}에 {{amount}}을 썼어요.",
                })
            ),
            soFarAsUsual: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, about as usual by now.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben, etwa wie üblich um diese Zeit.",
                    es: "Llevas {{amount}} gastados en {{period}}, como de costumbre a esta altura.",

                    fr: "Vous avez dépensé {{amount}} jusqu'ici en {{period}}, comme d'habitude à ce stade.",
                    pt: "Você gastou {{amount}} até agora em {{period}}, como de costume.",
                    "pt-PT": "Gastou {{amount}} até agora em {{period}}, como de costume.",
                    it: "Finora hai speso {{amount}} in {{period}}, più o meno come al solito a questo punto.",
                    nl: "Je hebt tot nu toe {{amount}} uitgegeven in {{period}}, ongeveer zoals gebruikelijk op dit moment.",
                    ja: "{{period}}のここまでの支出は{{amount}}で、この時点の普段とほぼ同じです。",
                    ko: "{{period}}에 지금까지 {{amount}}을 썼어요. 이맘때 평소와 비슷해요.",
                })
            ),
            soFarLess: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, {{percent}}% less than usual by now.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben, {{percent}} % weniger als um diese Zeit üblich.",
                    es: "Llevas {{amount}} gastados en {{period}}, un {{percent}}% menos de lo normal a esta altura.",

                    fr: "Vous avez dépensé {{amount}} jusqu'ici en {{period}}, {{percent}} % de moins que d'habitude.",
                    pt: "Você gastou {{amount}} até agora em {{period}}, {{percent}}% menos que o habitual.",
                    "pt-PT": "Gastou {{amount}} até agora em {{period}}, {{percent}}% menos que o habitual.",
                    it: "Finora hai speso {{amount}} in {{period}}, il {{percent}}% in meno del solito a questo punto.",
                    nl: "Je hebt tot nu toe {{amount}} uitgegeven in {{period}}, {{percent}}% minder dan gebruikelijk op dit moment.",
                    ja: "{{period}}のここまでの支出は{{amount}}で、この時点の普段より{{percent}}%少なくなっています。",
                    ko: "{{period}}에 지금까지 {{amount}}을 썼어요. 이맘때 평소보다 {{percent}}% 적어요.",
                })
            ),
            soFarMore: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}, {{percent}}% more than usual by now.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben, {{percent}} % mehr als um diese Zeit üblich.",
                    es: "Llevas {{amount}} gastados en {{period}}, un {{percent}}% más de lo normal a esta altura.",

                    fr: "Vous avez dépensé {{amount}} jusqu'ici en {{period}}, {{percent}} % de plus que d'habitude.",
                    pt: "Você gastou {{amount}} até agora em {{period}}, {{percent}}% mais que o habitual.",
                    "pt-PT": "Gastou {{amount}} até agora em {{period}}, {{percent}}% mais que o habitual.",
                    it: "Finora hai speso {{amount}} in {{period}}, il {{percent}}% in più del solito a questo punto.",
                    nl: "Je hebt tot nu toe {{amount}} uitgegeven in {{period}}, {{percent}}% meer dan gebruikelijk op dit moment.",
                    ja: "{{period}}のここまでの支出は{{amount}}で、この時点の普段より{{percent}}%多くなっています。",
                    ko: "{{period}}에 지금까지 {{amount}}을 썼어요. 이맘때 평소보다 {{percent}}% 많아요.",
                })
            ),
            soFarPlain: insert(
                t({
                    en: "You've spent {{amount}} so far in {{period}}.",
                    de: "Du hast in {{period}} bisher {{amount}} ausgegeben.",
                    es: "Llevas {{amount}} gastados en {{period}}.",

                    fr: "Vous avez dépensé {{amount}} jusqu'ici en {{period}}.",
                    pt: "Você gastou {{amount}} até agora em {{period}}.",
                    "pt-PT": "Gastou {{amount}} até agora em {{period}}.",
                    it: "Finora hai speso {{amount}} in {{period}}.",
                    nl: "Je hebt tot nu toe {{amount}} uitgegeven in {{period}}.",
                    ja: "{{period}}のここまでの支出は{{amount}}です。",
                    ko: "{{period}}에 지금까지 {{amount}}을 썼어요.",
                })
            ),
        },
        measures: {
            kept: t({
                en: "Kept",
                de: "Übrig",
                es: "Ahorrado",
                fr: "Épargné",
                pt: "Guardado",
                it: "Rimasto",
                nl: "Overgehouden",
                ja: "手元に残った額",
                ko: "남은 금액",
            }),
            savings: t({
                en: "Savings",
                de: "Gespart",
                es: "Ahorros",
                fr: "Épargne",
                pt: "Poupança",
                it: "Risparmi",
                nl: "Spaargeld",
                ja: "貯金",
                ko: "저축",
            }),
        },
        months: {
            averageLabel: t({
                en: "Avg",
                de: "Ø",
                es: "Prom.",
                "es-ES": "Media",
                fr: "Moy.",
                pt: "Méd.",
                it: "Media",
                nl: "Gem.",
                ja: "平均",
                ko: "평균",
            }),
            title: t({
                en: "Spending by month",
                de: "Ausgaben pro Monat",
                es: "Gasto por mes",
                fr: "Dépenses par mois",
                pt: "Despesas por mês",
                it: "Spesa per mese",
                nl: "Uitgaven per maand",
                ja: "月別の支出",
                ko: "월별 지출",
            }),
        },
        netWorth: {
            title: t({
                en: "Net worth",
                de: "Vermögen",
                es: "Patrimonio",
                fr: "Patrimoine",
                pt: "Patrimônio",
                "pt-PT": "Património",
                it: "Patrimonio netto",
                nl: "Nettovermogen",
                ja: "純資産",
                ko: "순자산",
            }),
        },
        standsOut: {
            biggest: insert(
                t({
                    en: "{{amount}} at {{name}} on {{date}} is the biggest purchase",
                    de: "{{amount}} bei {{name}} am {{date}} ist der größte Einkauf",
                    es: "{{amount}} en {{name}} el {{date}} es la mayor compra",

                    fr: "{{amount}} chez {{name}} le {{date}} est le plus gros achat",
                    pt: "{{amount}} em {{name}} em {{date}} é a maior compra",
                    it: "{{amount}} da {{name}} il {{date}} è l'acquisto più grande",
                    nl: "{{amount}} bij {{name}} op {{date}} is de grootste aankoop",
                    ja: "{{date}}の{{name}}での{{amount}}が最大の買い物です",
                    ko: "{{date}} {{name}}에서 쓴 {{amount}}이 가장 큰 구매예요",
                })
            ),
            biggestUnnamed: insert(
                t({
                    en: "The biggest purchase, {{amount}}, was on {{date}}",
                    de: "Der größte Einkauf, {{amount}}, war am {{date}}",
                    es: "La mayor compra, {{amount}}, fue el {{date}}",

                    fr: "Le plus gros achat, {{amount}}, date du {{date}}",
                    pt: "A maior compra, {{amount}}, foi em {{date}}",
                    it: "L'acquisto più grande, {{amount}}, è stato il {{date}}",
                    nl: "De grootste aankoop, {{amount}}, was op {{date}}",
                    ja: "最大の買い物は{{date}}の{{amount}}です",
                    ko: "가장 큰 구매는 {{date}}의 {{amount}}이에요",
                })
            ),
            empty: t({
                en: "Nothing stands out yet.",
                de: "Noch fällt nichts auf.",
                es: "Nada destaca todavía.",
                fr: "Rien ne ressort encore.",
                pt: "Nada se destaca ainda.",
                it: "Per ora non spicca nulla.",
                nl: "Er valt nog niets op.",
                ja: "今のところ目立つものはありません。",
                ko: "아직 눈에 띄는 게 없어요.",
            }),
            kept: insert(
                t({
                    en: "{{percent}}% of income",
                    de: "{{percent}} % der Einnahmen",
                    es: "{{percent}}% del ingreso",
                    fr: "{{percent}} % des revenus",
                    pt: "{{percent}}% das receitas",
                    it: "{{percent}}% delle entrate",
                    nl: "{{percent}}% van de inkomsten",
                    ja: "収入の{{percent}}%",
                    ko: "수입의 {{percent}}%",
                })
            ),
            keptHighest: insert(
                t({
                    en: "highest in {{count}} months",
                    de: "höchster Wert seit {{count}} Monaten",
                    es: "el más alto en {{count}} meses",

                    fr: "plus élevé en {{count}} mois",
                    pt: "maior em {{count}} meses",
                    it: "il più alto da {{count}} mesi",
                    nl: "hoogste in {{count}} maanden",
                    ja: "{{count}}か月で最高",
                    ko: "{{count}}개월 중 최고",
                })
            ),
            keptHighestSince: insert(
                t({
                    en: "highest since {{month}}",
                    de: "höchster Wert seit {{month}}",
                    es: "el más alto desde {{month}}",

                    fr: "plus élevé depuis {{month}}",
                    pt: "maior desde {{month}}",
                    it: "il più alto da {{month}}",
                    nl: "hoogste sinds {{month}}",
                    ja: "{{month}}以来の最高",
                    ko: "{{month}} 이후 최고",
                })
            ),
            keptLowest: insert(
                t({
                    en: "lowest in {{count}} months",
                    de: "niedrigster Wert seit {{count}} Monaten",
                    es: "el más bajo en {{count}} meses",

                    fr: "plus bas en {{count}} mois",
                    pt: "menor em {{count}} meses",
                    it: "il più basso da {{count}} mesi",
                    nl: "laagste in {{count}} maanden",
                    ja: "{{count}}か月で最低",
                    ko: "{{count}}개월 중 최저",
                })
            ),
            keptLowestSince: insert(
                t({
                    en: "lowest since {{month}}",
                    de: "niedrigster Wert seit {{month}}",
                    es: "el más bajo desde {{month}}",

                    fr: "plus bas depuis {{month}}",
                    pt: "menor desde {{month}}",
                    it: "il più basso da {{month}}",
                    nl: "laagste sinds {{month}}",
                    ja: "{{month}}以来の最低",
                    ko: "{{month}} 이후 최저",
                })
            ),
            keptUsual: insert(
                t({
                    en: "Usually {{percent}}%",
                    de: "Üblich {{percent}} %",
                    es: "Normalmente {{percent}}%",
                    fr: "Habituellement {{percent}} %",
                    pt: "Normalmente {{percent}}%",
                    it: "Di solito {{percent}}%",
                    nl: "Meestal {{percent}}%",
                    ja: "普段は{{percent}}%",
                    ko: "보통 {{percent}}%",
                })
            ),
            less: insert(
                t({
                    en: "{{amount}} less",
                    de: "{{amount}} weniger",
                    es: "{{amount}} menos",
                    fr: "{{amount}} de moins",
                    pt: "{{amount}} menos",
                    it: "{{amount}} in meno",
                    nl: "{{amount}} minder",
                    ja: "{{amount}}少ない",
                    ko: "{{amount}} 적음",
                })
            ),
            more: insert(
                t({
                    en: "{{amount}} more",
                    de: "{{amount}} mehr",
                    es: "{{amount}} más",
                    fr: "{{amount}} de plus",
                    pt: "{{amount}} mais",
                    it: "{{amount}} in più",
                    nl: "{{amount}} meer",
                    ja: "{{amount}}多い",
                    ko: "{{amount}} 많음",
                })
            ),
            over: insert(
                t({
                    en: "{{amount}} over",
                    de: "{{amount}} drüber",
                    es: "{{amount}} de más",
                    fr: "{{amount}} au-dessus",
                    pt: "{{amount}} acima",
                    it: "{{amount}} oltre",
                    nl: "{{amount}} over",
                    ja: "{{amount}}超過",
                    ko: "{{amount}} 초과",
                })
            ),
            ranOut: insert(
                t({
                    en: "Ran out {{date}}, {{days}} days early",
                    de: "Aufgebraucht am {{date}}, {{days}} Tage zu früh",
                    es: "Se agotó el {{date}}, {{days}} días antes",

                    fr: "Épuisé le {{date}}, {{days}} jours avant",
                    pt: "Acabou em {{date}}, {{days}} dias antes",
                    it: "Esaurito il {{date}}, {{days}} giorni in anticipo",
                    nl: "Op {{date}} op, {{days}} dagen te vroeg",
                    ja: "{{date}}に使い切りました（{{days}}日早く）",
                    ko: "{{date}}에 다 썼어요. {{days}}일 일찍 소진했어요",
                })
            ),
            ranOutOne: insert(
                t({
                    en: "Ran out {{date}}, 1 day early",
                    de: "Aufgebraucht am {{date}}, 1 Tag zu früh",
                    es: "Se agotó el {{date}}, 1 día antes",

                    fr: "Épuisé le {{date}}, 1 jour avant",
                    pt: "Acabou em {{date}}, 1 dia antes",
                    it: "Esaurito il {{date}}, 1 giorno in anticipo",
                    nl: "Op {{date}} op, 1 dag te vroeg",
                    ja: "{{date}}に使い切りました（1日早く）",
                    ko: "{{date}}에 다 썼어요. 1일 일찍 소진했어요",
                })
            ),
            title: t({
                en: "What stands out",
                de: "Was auffällt",
                es: "Qué destaca",
                fr: "Ce qui ressort",
                pt: "O que se destaca",
                it: "Cosa spicca",
                nl: "Wat opvalt",
                ja: "目立つポイント",
                ko: "눈에 띄는 점",
            }),
            usual: insert(
                t({
                    en: "You usually spend {{amount}} here",
                    de: "Hier gibst du üblicherweise {{amount}} aus",
                    es: "Normalmente gastas {{amount}} aquí",

                    fr: "Vous dépensez habituellement {{amount}} ici",
                    pt: "Você costuma gastar {{amount}} aqui",
                    "pt-PT": "Costuma gastar {{amount}} aqui",
                    it: "Di solito qui spendi {{amount}}",
                    nl: "Je geeft hier meestal {{amount}} uit",
                    ja: "普段はここで{{amount}}使っています",
                    ko: "여기서는 보통 {{amount}}을 써요",
                })
            ),
            usualByNow: insert(
                t({
                    en: "You usually spend {{amount}} here by now",
                    de: "Hier gibst du bis jetzt üblicherweise {{amount}} aus",
                    es: "Normalmente gastas {{amount}} aquí a esta altura",

                    fr: "Vous dépensez habituellement {{amount}} ici à ce stade",
                    pt: "Você costuma gastar {{amount}} aqui até agora",
                    "pt-PT": "Costuma gastar {{amount}} aqui até agora",
                    it: "Di solito qui a questo punto spendi {{amount}}",
                    nl: "Je geeft hier op dit moment meestal {{amount}} uit",
                    ja: "この時点では、普段ここで{{amount}}使っています",
                    ko: "이맘때 여기서는 보통 {{amount}}을 써요",
                })
            ),
        },
        table: {
            category: t({
                en: "Category",
                de: "Kategorie",
                es: "Categoría",
                fr: "Catégorie",
                pt: "Categoria",
                it: "Categoria",
                nl: "Categorie",
                ja: "カテゴリ",
                ko: "카테고리",
            }),
            left: t({
                en: "Left",
                de: "Übrig",
                es: "Queda",
                fr: "Restant",
                pt: "Restam",
                it: "Rimasto",
                nl: "Over",
                ja: "残り",
                ko: "남음",
            }),
            spent: t({
                en: "Spent",
                de: "Ausgegeben",
                es: "Gastado",
                fr: "Dépensé",
                pt: "Gasto",
                it: "Speso",
                nl: "Uitgegeven",
                ja: "支出",
                ko: "지출",
            }),
        },
        trend: {
            single: t({
                en: "Shows up after your second month.",
                de: "Erscheint nach deinem zweiten Monat.",
                es: "Aparece después de tu segundo mes.",

                fr: "Apparaît après votre deuxième mois.",
                pt: "Aparece depois do seu segundo mês.",
                it: "Compare dopo il tuo secondo mese.",
                nl: "Verschijnt na je tweede maand.",
                ja: "2か月目以降に表示されます。",
                ko: "두 번째 달부터 표시돼요.",
            }),
            spending: t({
                en: "Spending",
                de: "Ausgaben",
                es: "Gastos",
                fr: "Dépenses",
                pt: "Despesas",
                it: "Spesa",
                nl: "Uitgaven",
                ja: "支出",
                ko: "지출",
            }),
            title: t({
                en: "Income and spending",
                de: "Einnahmen und Ausgaben",
                es: "Ingresos y gastos",
                fr: "Revenus et dépenses",
                pt: "Receitas e despesas",
                it: "Entrate e spese",
                nl: "Inkomsten en uitgaven",
                ja: "収入と支出",
                ko: "수입과 지출",
            }),
        },
    },
    key: "dashboard-insights",
} satisfies Dictionary;

export default dashboardInsights;
