import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardBudgetsPlan = {
    content: {
        back: t({
            en: "Back to the plan",
            de: "Zurück zum Plan",
            es: "Volver al plan",
            fr: "Retour au plan",
            pt: "Voltar ao plano",
        }),
        chart: {
            backIn: insert(
                t({
                    en: "You're back in {{month}}.",
                    de: "Im {{month}} bist du wieder im Plus.",
                    es: "En {{month}} te recuperas.",
                    fr: "Vous repassez au vert en {{month}}.",
                    pt: "Em {{month}} você se recupera.",
                })
            ),
            covered: t({
                en: "Every month ahead is covered.",
                de: "Jeder kommende Monat ist gedeckt.",
                es: "Cada mes por delante está cubierto.",
                fr: "Chaque mois à venir est couvert.",
                pt: "Cada mês pela frente está coberto.",
            }),
            runs: insert(
                t({
                    en: "{{month}} runs short on {{category}}.",
                    de: "{{month}} reicht bei {{category}} nicht.",
                    es: "En {{month}} falta por {{category}}.",
                    fr: "{{month}} manque à cause de {{category}}.",
                    pt: "Em {{month}} falta por {{category}}.",
                })
            ),
            runsPlain: insert(
                t({
                    en: "{{month}} runs short.",
                    de: "{{month}} reicht nicht.",
                    es: "En {{month}} falta dinero.",
                    fr: "{{month}} manque d'argent.",
                    pt: "Em {{month}} falta dinheiro.",
                })
            ),
            runsRange: insert(
                t({
                    en: "{{from}} to {{to}} run short on {{category}}.",
                    de: "{{from}} bis {{to}} reichen bei {{category}} nicht.",
                    es: "De {{from}} a {{to}} falta por {{category}}.",
                    fr: "De {{from}} à {{to}}, ça manque à cause de {{category}}.",
                    pt: "De {{from}} a {{to}} falta por {{category}}.",
                })
            ),
            runsRangePlain: insert(
                t({
                    en: "{{from}} to {{to}} run short.",
                    de: "{{from}} bis {{to}} reichen nicht.",
                    es: "De {{from}} a {{to}} falta dinero.",
                    fr: "De {{from}} à {{to}}, l'argent manque.",
                    pt: "De {{from}} a {{to}} falta dinheiro.",
                })
            ),
            short: insert(
                t({
                    en: "{{count}} of {{total}} short",
                    de: "{{count}} von {{total}} zu knapp",
                    es: "{{count}} de {{total}} en falta",
                    fr: "{{count}} sur {{total}} en manque",
                    pt: "{{count}} de {{total}} em falta",
                })
            ),
            title: t({
                en: "Left each month",
                de: "Übrig pro Monat",
                es: "Lo que queda cada mes",
                fr: "Reste chaque mois",
                pt: "Sobra a cada mês",
            }),
            yearEnds: t({
                en: "The year ends short.",
                de: "Das Jahr endet im Minus.",
                es: "El año cierra en falta.",
                fr: "L'année finit en manque.",
                pt: "O ano termina em falta.",
            }),
        },
        columns: {
            aMonth: t({ en: "A month", de: "Pro Monat", es: "Al mes", fr: "Par mois", pt: "Por mês" }),
            arrived: t({ en: "Arrived", de: "Eingegangen", es: "Llegó", fr: "Arrivé", pt: "Chegou" }),
            biggest: t({ en: "Biggest", de: "Größter", es: "El mayor", fr: "Le plus gros", pt: "O maior" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            goal: t({ en: "Goal", de: "Sparziel", es: "Meta", fr: "Objectif", pt: "Meta" }),
            got: t({ en: "Got", de: "Erhalten", es: "Recibido", fr: "Reçu", pt: "Recebido" }),
            in: t({ en: "In", de: "Rein", es: "Entra", fr: "Entrées", pt: "Entra" }),
            left: t({ en: "Left", de: "Übrig", es: "Queda", fr: "Reste", pt: "Sobra" }),
            month: t({ en: "Month", de: "Monat", es: "Mes", fr: "Mois", pt: "Mês" }),
            note: t({ en: "Note", de: "Notiz", es: "Nota", fr: "Note", pt: "Nota" }),
            now: t({ en: "Now", de: "Jetzt", es: "Ahora", fr: "Actuel", pt: "Agora" }),
            out: t({ en: "Out", de: "Raus", es: "Sale", fr: "Sorties", pt: "Sai" }),
            planned: t({ en: "Planned", de: "Geplant", es: "Planificado", fr: "Planifié", pt: "Planejado" }),
            result: t({ en: "Result", de: "Ergebnis", es: "Resultado", fr: "Résultat", pt: "Resultado" }),
            setAside: t({ en: "Set aside", de: "Zurückgelegt", es: "Apartado", fr: "Mis de côté", pt: "Reservado" }),
            source: t({ en: "Source", de: "Quelle", es: "Fuente", fr: "Source", pt: "Fonte" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            status: t({ en: "Status", de: "Status", es: "Estado", fr: "Statut", pt: "Status" }),
            toward: t({ en: "Toward", de: "Für", es: "Hacia", fr: "Vers", pt: "Rumo a" }),
            typical: t({ en: "Typical", de: "Üblich", es: "Habitual", fr: "Habituel", pt: "Habitual" }),
            used: t({ en: "Used", de: "Verbraucht", es: "Usado", fr: "Utilisé", pt: "Usado" }),
        },
        dialog: {
            aboveTypical: insert(
                t({
                    en: "{{month}} is {{amount}} above typical.",
                    de: "{{month}} liegt {{amount}} über dem Üblichen.",
                    es: "{{month}} está {{amount}} por encima de lo habitual.",
                    fr: "{{month}} dépasse l'habituel de {{amount}}.",
                    pt: "{{month}} está {{amount}} acima do habitual.",
                })
            ),
            addIncomeTitle: t({
                en: "Add income",
                de: "Einnahme hinzufügen",
                es: "Agregar ingreso",
                fr: "Ajouter un revenu",
                pt: "Adicionar receita",
            }),
            addTitle: t({
                en: "Add a category",
                de: "Kategorie hinzufügen",
                es: "Agregar una categoría",
                fr: "Ajouter une catégorie",
                pt: "Adicionar uma categoria",
            }),
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            chart: insert(
                t({
                    en: "{{name}}, month by month",
                    de: "{{name}}, Monat für Monat",
                    es: "{{name}}, mes a mes",
                    fr: "{{name}}, mois par mois",
                    pt: "{{name}}, mês a mês",
                })
            ),
            choose: t({
                en: "Choose a category",
                de: "Kategorie wählen",
                es: "Elige una categoría",
                fr: "Choisissez une catégorie",
                pt: "Escolha uma categoria",
            }),
            copyForward: insert(
                t({
                    en: "Copy {{month}} forward",
                    de: "{{month}} weiterkopieren",
                    es: "Copiar {{month}} en adelante",
                    fr: "Copier {{month}} sur la suite",
                    pt: "Copiar {{month}} adiante",
                })
            ),
            failed: t({
                en: "Couldn't save the plan. Try again.",
                de: "Der Plan konnte nicht gespeichert werden. Versuch es noch mal.",
                es: "No se pudo guardar el plan. Inténtalo de nuevo.",
                fr: "Impossible d'enregistrer le plan. Réessayez.",
                pt: "Não foi possível salvar o plano. Tente de novo.",
            }),
            fill: t({ en: "Fill", de: "Auffüllen", es: "Rellenar", fr: "Remplir", pt: "Preencher" }),
            fixes: insert(
                t({
                    en: "{{month}} stops running short.",
                    de: "{{month}} reicht dann wieder.",
                    es: "{{month}} deja de quedarse en falta.",
                    fr: "{{month}} ne manque plus.",
                    pt: "{{month}} deixa de ficar em falta.",
                })
            ),
            fixesMany: insert(
                t({
                    en: "{{count}} months stop running short.",
                    de: "{{count}} Monate reichen dann wieder.",
                    es: "{{count}} meses dejan de quedarse en falta.",
                    fr: "{{count}} mois ne manquent plus.",
                    pt: "{{count}} meses deixam de ficar em falta.",
                })
            ),
            notEnough: t({
                en: "Not enough to cover the month.",
                de: "Reicht nicht, um den Monat zu decken.",
                es: "No alcanza para cubrir el mes.",
                fr: "Pas assez pour couvrir le mois.",
                pt: "Não basta para cobrir o mês.",
            }),
            outlines: t({
                en: "outlines are plan",
                de: "Umrandungen sind Plan",
                es: "los contornos son el plan",
                fr: "les contours sont le plan",
                pt: "os contornos são o plano",
            }),
            overPlan: insert(
                t({
                    en: "{{month}} went {{amount}} over its plan.",
                    de: "{{month}} lag {{amount}} über dem Plan.",
                    es: "{{month}} se pasó {{amount}} de su plan.",
                    fr: "{{month}} a dépassé son plan de {{amount}}.",
                    pt: "{{month}} passou {{amount}} do plano.",
                })
            ),
            planTitle: insert(
                t({
                    en: "Plan {{year}} for {{name}}",
                    de: "Plan {{year}} für {{name}}",
                    es: "Plan {{year}} para {{name}}",
                    fr: "Plan {{year}} pour {{name}}",
                    pt: "Plano {{year}} para {{name}}",
                })
            ),
            same: t({
                en: "Same amount every month",
                de: "Jeden Monat derselbe Betrag",
                es: "El mismo monto cada mes",
                fr: "Le même montant chaque mois",
                pt: "O mesmo valor todo mês",
            }),
            save: insert(
                t({
                    en: "Save the {{year}} plan",
                    de: "Plan {{year}} speichern",
                    es: "Guardar el plan {{year}}",
                    fr: "Enregistrer le plan {{year}}",
                    pt: "Salvar o plano {{year}}",
                })
            ),
            saved: t({
                en: "Plan saved",
                de: "Plan gespeichert",
                es: "Plan guardado",
                fr: "Plan enregistré",
                pt: "Plano salvo",
            }),
            saves: t({ en: "Saves", de: "Spart", es: "Ahorra", fr: "Économise", pt: "Economiza" }),
            stillShort: insert(
                t({
                    en: "Still {{amount}} short: more than that is spent already.",
                    de: "Es fehlen noch {{amount}}: Mehr als das ist schon ausgegeben.",
                    es: "Aún faltan {{amount}}: ya se gastó más que eso.",
                    fr: "Il manque encore {{amount}} : plus a déjà été dépensé.",
                    pt: "Ainda faltam {{amount}}: já foi gasto mais do que isso.",
                })
            ),
            trimConfirm: insert(
                t({
                    en: "Trim to {{amount}} through {{month}}",
                    de: "Auf {{amount}} bis {{month}} kürzen",
                    es: "Recortar a {{amount}} hasta {{month}}",
                    fr: "Réduire à {{amount}} jusqu'à {{month}}",
                    pt: "Cortar para {{amount}} até {{month}}",
                })
            ),
            trimTitle: insert(
                t({
                    en: "Trim {{name}} through {{month}}",
                    de: "{{name}} bis {{month}} kürzen",
                    es: "Recortar {{name}} hasta {{month}}",
                    fr: "Réduire {{name}} jusqu'à {{month}}",
                    pt: "Cortar {{name}} até {{month}}",
                })
            ),
            trimTo: t({ en: "Trim to", de: "Kürzen auf", es: "Recortar a", fr: "Réduire à", pt: "Cortar para" }),
            typical: insert(
                t({
                    en: "typical {{amount}}",
                    de: "üblich {{amount}}",
                    es: "habitual {{amount}}",
                    fr: "habituel {{amount}}",
                    pt: "habitual {{amount}}",
                })
            ),
            was: t({ en: "Was", de: "War", es: "Era", fr: "Avant", pt: "Era" }),
        },
        empty: {
            monthLine: t({
                en: "Add what you expect to come in, then what each category should get.",
                de: "Füge hinzu, was du erwartest, und dann, was jede Kategorie bekommen soll.",
                es: "Agrega lo que esperas que entre y luego lo que debe recibir cada categoría.",
                fr: "Ajoutez ce que vous attendez en entrée, puis ce que chaque catégorie doit recevoir.",
                pt: "Adicione o que espera receber e depois quanto cada categoria deve ter.",
            }),
            monthTitle: insert(
                t({
                    en: "Nothing planned for {{month}}",
                    de: "Für {{month}} ist nichts geplant",
                    es: "Nada planificado para {{month}}",
                    fr: "Rien de planifié pour {{month}}",
                    pt: "Nada planejado para {{month}}",
                })
            ),
            planFirst: insert(
                t({
                    en: "Plan {{month}}",
                    de: "{{month}} planen",
                    es: "Planificar {{month}}",
                    fr: "Planifier {{month}}",
                    pt: "Planejar {{month}}",
                })
            ),
            yearLine: t({
                en: "Add what comes in and what goes out, month by month.",
                de: "Füge Einnahmen und Ausgaben hinzu, Monat für Monat.",
                es: "Agrega lo que entra y lo que sale, mes a mes.",
                fr: "Ajoutez ce qui entre et ce qui sort, mois par mois.",
                pt: "Adicione o que entra e o que sai, mês a mês.",
            }),
            yearTitle: insert(
                t({
                    en: "Nothing planned for {{year}}",
                    de: "Für {{year}} ist nichts geplant",
                    es: "Nada planificado para {{year}}",
                    fr: "Rien de planifié pour {{year}}",
                    pt: "Nada planejado para {{year}}",
                })
            ),
        },
        kpi: {
            allArrived: t({
                en: "All arrived",
                de: "Alles eingegangen",
                es: "Todo llegó",
                fr: "Tout est arrivé",
                pt: "Tudo chegou",
            }),
            count: insert(
                t({
                    en: "{{count}} of {{total}}",
                    de: "{{count}} von {{total}}",
                    es: "{{count}} de {{total}}",
                    fr: "{{count}} sur {{total}}",
                    pt: "{{count}} de {{total}}",
                })
            ),
            expected: t({ en: "Expected", de: "Erwartet", es: "Previsto", fr: "Prévu", pt: "Previsto" }),
            fromGoals: t({
                en: "a month, from goals",
                de: "pro Monat, aus Sparzielen",
                es: "al mes, de las metas",
                fr: "par mois, des objectifs",
                pt: "por mês, das metas",
            }),
            goals: insert(
                t({
                    en: "{{count}} goals",
                    de: "{{count}} Sparziele",
                    es: "{{count}} metas",
                    fr: "{{count}} objectifs",
                    pt: "{{count}} metas",
                })
            ),
            in: t({ en: "In", de: "Rein", es: "Entra", fr: "Entrées", pt: "Entra" }),
            leftByPlan: t({
                en: "Left by the plan",
                de: "Übrig laut Plan",
                es: "Queda según el plan",
                fr: "Reste selon le plan",
                pt: "Sobra pelo plano",
            }),
            leftOver: t({ en: "Left over", de: "Übrig geblieben", es: "Sobró", fr: "Restant", pt: "Sobrou" }),
            leftThisMonth: t({
                en: "Left this month",
                de: "Diesen Monat übrig",
                es: "Queda este mes",
                fr: "Reste ce mois-ci",
                pt: "Sobra este mês",
            }),
            monthAhead: t({
                en: "1 month ahead",
                de: "1 Monat voraus",
                es: "1 mes por delante",
                fr: "1 mois à venir",
                pt: "1 mês pela frente",
            }),
            monthsAhead: insert(
                t({
                    en: "{{count}} months ahead",
                    de: "{{count}} Monate voraus",
                    es: "{{count}} meses por delante",
                    fr: "{{count}} mois à venir",
                    pt: "{{count}} meses pela frente",
                })
            ),
            monthsPlanned: t({
                en: "Months planned",
                de: "Geplante Monate",
                es: "Meses planificados",
                fr: "Mois planifiés",
                pt: "Meses planejados",
            }),
            noGoals: t({
                en: "No goals",
                de: "Keine Sparziele",
                es: "Sin metas",
                fr: "Aucun objectif",
                pt: "Nenhuma meta",
            }),
            noMonthsAhead: t({
                en: "No months ahead",
                de: "Keine Monate voraus",
                es: "Sin meses por delante",
                fr: "Aucun mois à venir",
                pt: "Nenhum mês pela frente",
            }),
            notStarted: t({
                en: "Not started",
                de: "Nicht gestartet",
                es: "Sin empezar",
                fr: "Pas commencé",
                pt: "Não começou",
            }),
            notYet: t({
                en: "Not expected yet",
                de: "Noch nicht erwartet",
                es: "Aún no previsto",
                fr: "Pas encore prévu",
                pt: "Ainda não previsto",
            }),
            nothingExpected: t({
                en: "Nothing expected",
                de: "Nichts erwartet",
                es: "Nada previsto",
                fr: "Rien de prévu",
                pt: "Nada previsto",
            }),
            nothingPlanned: t({
                en: "Nothing planned",
                de: "Nichts geplant",
                es: "Nada planificado",
                fr: "Rien de planifié",
                pt: "Nada planejado",
            }),
            ofIncome: t({
                en: "of income",
                de: "der Einnahmen",
                es: "de los ingresos",
                fr: "des revenus",
                pt: "da renda",
            }),
            oneGoal: t({ en: "1 goal", de: "1 Sparziel", es: "1 meta", fr: "1 objectif", pt: "1 meta" }),
            out: t({ en: "Out", de: "Raus", es: "Sale", fr: "Sorties", pt: "Sai" }),
            overPlan: t({
                en: "over plan",
                de: "über dem Plan",
                es: "sobre el plan",
                fr: "au-dessus du plan",
                pt: "acima do plano",
            }),
            perMonth: insert(
                t({
                    en: "{{amount}} a month",
                    de: "{{amount}} im Monat",
                    es: "{{amount}} al mes",
                    fr: "{{amount}} par mois",
                    pt: "{{amount}} por mês",
                })
            ),
            planned: t({ en: "Planned", de: "Geplant", es: "Planificado", fr: "Planifié", pt: "Planejado" }),
            setAside: t({ en: "Set aside", de: "Zurückgelegt", es: "Apartado", fr: "Mis de côté", pt: "Reservado" }),
            setAsideAmount: insert(
                t({
                    en: "{{amount}} set aside",
                    de: "{{amount}} zurückgelegt",
                    es: "{{amount}} apartado",
                    fr: "{{amount}} mis de côté",
                    pt: "{{amount}} reservado",
                })
            ),
            shortBy: t({
                en: "Short by the plan",
                de: "Fehlbetrag laut Plan",
                es: "Falta según el plan",
                fr: "Manque selon le plan",
                pt: "Falta pelo plano",
            }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            toCome: insert(
                t({
                    en: "{{amount}} still to come",
                    de: "Noch {{amount}} zu erwarten",
                    es: "Faltan {{amount}} por llegar",
                    fr: "{{amount}} encore à venir",
                    pt: "Faltam {{amount}} para chegar",
                })
            ),
            unassigned: t({
                en: "Not assigned yet",
                de: "Noch nicht zugewiesen",
                es: "Sin asignar",
                fr: "Pas encore attribué",
                pt: "Ainda não atribuído",
            }),
            underPlan: t({
                en: "under plan",
                de: "unter dem Plan",
                es: "bajo el plan",
                fr: "sous le plan",
                pt: "abaixo do plano",
            }),
        },
        menu: {
            more: insert(
                t({
                    en: "More for {{name}}",
                    de: "Mehr für {{name}}",
                    es: "Más opciones para {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            plan: insert(
                t({
                    en: "Plan {{year}}",
                    de: "Plan {{year}}",
                    es: "Planificar {{year}}",
                    fr: "Planifier {{year}}",
                    pt: "Planejar {{year}}",
                })
            ),
            trim: t({ en: "Trim", de: "Kürzen", es: "Recortar", fr: "Réduire", pt: "Cortar" }),
        },
        month: {
            addCategory: t({
                en: "Add a category",
                de: "Kategorie hinzufügen",
                es: "Agregar una categoría",
                fr: "Ajouter une catégorie",
                pt: "Adicionar uma categoria",
            }),
            addIncome: t({
                en: "Add income",
                de: "Einnahme hinzufügen",
                es: "Agregar ingreso",
                fr: "Ajouter un revenu",
                pt: "Adicionar receita",
            }),
            in: t({ en: "In", de: "Rein", es: "Entra", fr: "Entrées", pt: "Entra" }),
            left: t({ en: "Left", de: "Übrig", es: "Queda", fr: "Reste", pt: "Sobra" }),
            leftOver: t({ en: "Left over", de: "Übrig geblieben", es: "Sobró", fr: "Restant", pt: "Sobrou" }),
            lockedNote: t({
                en: "Editing changes the current window, not this one.",
                de: "Beim Bearbeiten ändert sich der aktuelle Zeitraum, nicht dieser.",
                es: "Editar cambia el periodo actual, no este.",
                fr: "Modifier change la période en cours, pas celle-ci.",
                pt: "Editar muda o período atual, não este.",
            }),
            noGoals: t({
                en: "No goals are setting money aside.",
                de: "Kein Sparziel legt Geld zur Seite.",
                es: "Ninguna meta está apartando dinero.",
                fr: "Aucun objectif ne met d'argent de côté.",
                pt: "Nenhuma meta está reservando dinheiro.",
            }),
            noIncome: t({
                en: "Nothing has come in yet.",
                de: "Bisher ist nichts eingegangen.",
                es: "Todavía no ha entrado nada.",
                fr: "Rien n'est encore arrivé.",
                pt: "Nada entrou ainda.",
            }),
            of: insert(
                t({
                    en: "{{spent}} of {{planned}}",
                    de: "{{spent}} von {{planned}}",
                    es: "{{spent}} de {{planned}}",
                    fr: "{{spent}} sur {{planned}}",
                    pt: "{{spent}} de {{planned}}",
                })
            ),
            out: t({ en: "Out", de: "Raus", es: "Sale", fr: "Sorties", pt: "Sai" }),
            setAside: t({ en: "Set aside", de: "Zurückgelegt", es: "Apartado", fr: "Mis de côté", pt: "Reservado" }),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            spentAgainst: t({
                en: "Spent against income",
                de: "Ausgaben gegenüber Einnahmen",
                es: "Gasto frente a ingresos",
                fr: "Dépenses face aux revenus",
                pt: "Gasto frente à renda",
            }),
            whereItWent: t({
                en: "Where it went",
                de: "Wohin es ging",
                es: "A dónde fue",
                fr: "Où c'est allé",
                pt: "Para onde foi",
            }),
        },
        nextYear: t({
            en: "Next year",
            de: "Nächstes Jahr",
            es: "Año siguiente",
            fr: "Année suivante",
            pt: "Próximo ano",
        }),
        previousYear: t({
            en: "Previous year",
            de: "Voriges Jahr",
            es: "Año anterior",
            fr: "Année précédente",
            pt: "Ano anterior",
        }),
        row: {
            expected: t({ en: "Expected", de: "Erwartet", es: "Previsto", fr: "Prévu", pt: "Previsto" }),
            left: insert(
                t({
                    en: "{{amount}} left",
                    de: "{{amount}} übrig",
                    es: "Quedan {{amount}}",
                    fr: "Reste {{amount}}",
                    pt: "Sobram {{amount}}",
                })
            ),
            onPlan: t({
                en: "On plan",
                de: "Im Plan",
                es: "Según el plan",
                fr: "Conforme au plan",
                pt: "Conforme o plano",
            }),
            over: insert(
                t({
                    en: "{{amount}} over",
                    de: "{{amount}} drüber",
                    es: "{{amount}} de más",
                    fr: "{{amount}} de trop",
                    pt: "{{amount}} a mais",
                })
            ),
            paid: insert(
                t({
                    en: "{{amount}} paid",
                    de: "{{amount}} bezahlt",
                    es: "{{amount}} pagado",
                    fr: "{{amount}} payé",
                    pt: "{{amount}} pago",
                })
            ),
            perDay: insert(
                t({
                    en: "{{amount}}/day",
                    de: "{{amount}}/Tag",
                    es: "{{amount}}/día",
                    fr: "{{amount}}/jour",
                    pt: "{{amount}}/dia",
                })
            ),
            toward: insert(
                t({
                    en: "{{amount}}, {{date}}",
                    de: "{{amount}}, {{date}}",
                    es: "{{amount}}, {{date}}",
                    fr: "{{amount}}, {{date}}",
                    pt: "{{amount}}, {{date}}",
                })
            ),
            under: insert(
                t({
                    en: "{{amount}} under",
                    de: "{{amount}} darunter",
                    es: "{{amount}} por debajo",
                    fr: "{{amount}} en dessous",
                    pt: "{{amount}} abaixo",
                })
            ),
        },
        status: {
            ahead: t({ en: "Ahead", de: "Voraus", es: "Por venir", fr: "À venir", pt: "Por vir" }),
            closed: t({ en: "Closed", de: "Abgeschlossen", es: "Cerrado", fr: "Clos", pt: "Fechado" }),
            current: t({ en: "Current", de: "Aktuell", es: "En curso", fr: "En cours", pt: "Atual" }),
            short: insert(
                t({
                    en: "{{amount}} short",
                    de: "{{amount}} zu wenig",
                    es: "Faltan {{amount}}",
                    fr: "{{amount}} manquants",
                    pt: "Faltam {{amount}}",
                })
            ),
        },
        title: t({ en: "Plan", de: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
        uncategorizedIn: t({
            en: "Other income",
            de: "Sonstige Einnahmen",
            es: "Otros ingresos",
            fr: "Autres revenus",
            pt: "Outras receitas",
        }),
        uncategorizedOut: t({
            en: "Uncategorized",
            de: "Ohne Kategorie",
            es: "Sin categoría",
            fr: "Sans catégorie",
            pt: "Sem categoria",
        }),
    },
    key: "dashboard-budgets-plan",
} satisfies Dictionary;

export default dashboardBudgetsPlan;
