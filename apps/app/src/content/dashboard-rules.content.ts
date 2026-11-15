import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardRules = {
    content: {
        cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        close: t({ en: "Close", de: "Schließen", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
        columns: {
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            becomes: t({ en: "Becomes", de: "Wird zu", es: "Pasa a", fr: "Devient", pt: "Passa a" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            description: t({
                en: "Description",
                de: "Beschreibung",
                es: "Descripción",
                fr: "Description",
                pt: "Descrição",
            }),
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            entry: t({ en: "Entry", de: "Eintrag", es: "Movimiento", fr: "Opération", pt: "Lançamento" }),
            lastMatch: t({
                en: "Last match",
                de: "Letzter Treffer",
                es: "Última coincidencia",
                fr: "Dernière correspondance",
                pt: "Última ocorrência",
            }),
            matches: t({ en: "Matches", de: "Treffer", es: "Coincidencias", fr: "Correspondances", pt: "Ocorrências" }),
            now: t({ en: "Now", de: "Jetzt", es: "Ahora", fr: "Actuel", pt: "Agora" }),
            on: t({ en: "On", de: "Aktiv", es: "Activa", fr: "Active", pt: "Ativa" }),
            order: t({ en: "Order", de: "Reihenfolge", es: "Orden", fr: "Ordre", pt: "Ordem" }),
            picked: t({
                en: "You picked it",
                de: "Deine Wahl",
                es: "La elegiste",
                fr: "Votre choix",
                pt: "Você escolheu",
            }),
            result: t({ en: "Result", de: "Ergebnis", es: "Resultado", fr: "Résultat", pt: "Resultado" }),
            rule: t({ en: "Rule", de: "Regel", es: "Regla", fr: "Règle", pt: "Regra" }),
            outcome: t({ en: "Then", de: "Dann", es: "Entonces", fr: "Alors", pt: "Então" }),
            when: t({ en: "When", de: "Wenn", es: "Cuando", fr: "Quand", pt: "Quando" }),
        },
        conflicts: {
            both: insert(
                t({
                    en: "{{first}} and {{second}} both match {{count}} entries",
                    de: "{{first}} und {{second}} treffen beide auf {{count}} Einträge zu",
                    es: "{{first}} y {{second}} coinciden en {{count}} movimientos",
                    fr: "{{first}} et {{second}} correspondent à {{count}} opérations",
                    pt: "{{first}} e {{second}} coincidem em {{count}} lançamentos",
                })
            ),
            bothOne: insert(
                t({
                    en: "{{first}} and {{second}} both match 1 entry",
                    de: "{{first}} und {{second}} treffen beide auf 1 Eintrag zu",
                    es: "{{first}} y {{second}} coinciden en 1 movimiento",
                    fr: "{{first}} et {{second}} correspondent à 1 opération",
                    pt: "{{first}} e {{second}} coincidem em 1 lançamento",
                })
            ),
            emptyLine: t({
                en: "Two rules that file the same entries under different categories show up here.",
                de: "Zwei Regeln, die dieselben Einträge in verschiedene Kategorien sortieren, erscheinen hier.",
                es: "Aquí aparecen dos reglas que mandan los mismos movimientos a categorías distintas.",
                fr: "Deux règles qui classent les mêmes opérations dans des catégories différentes apparaissent ici.",
                pt: "Duas regras que mandam os mesmos lançamentos para categorias diferentes aparecem aqui.",
            }),
            emptyTitle: t({
                en: "No conflicts",
                de: "Keine Konflikte",
                es: "Sin conflictos",
                fr: "Aucun conflit",
                pt: "Sem conflitos",
            }),
            firstLine: insert(
                t({
                    en: "Keeps today's result. {{category}} from {{first}}.",
                    de: "Behält das heutige Ergebnis. {{category}} von {{first}}.",
                    es: "Mantiene el resultado de hoy. {{category}} por {{first}}.",
                    fr: "Garde le résultat actuel. {{category}} par {{first}}.",
                    pt: "Mantém o resultado de hoje. {{category}} por {{first}}.",
                })
            ),
            firstLineTags: insert(
                t({
                    en: "Keeps today's result. {{category}} from {{first}}, the {{tags}} tag from {{second}}.",
                    de: "Behält das heutige Ergebnis. {{category}} von {{first}}, das Tag {{tags}} von {{second}}.",
                    es: "Mantiene el resultado de hoy. {{category}} por {{first}}, la etiqueta {{tags}} por {{second}}.",
                    fr: "Garde le résultat actuel. {{category}} par {{first}}, l'étiquette {{tags}} par {{second}}.",
                    pt: "Mantém o resultado de hoje. {{category}} por {{first}}, a etiqueta {{tags}} por {{second}}.",
                })
            ),
            leaveLine: t({
                en: "Stays in Conflicts.",
                de: "Bleibt in den Konflikten.",
                es: "Se queda en Conflictos.",
                fr: "Reste dans Conflits.",
                pt: "Continua em Conflitos.",
            }),
            leaveTitle: t({
                en: "Leave it for now",
                de: "Vorerst so lassen",
                es: "Dejarlo por ahora",
                fr: "Laisser pour l'instant",
                pt: "Deixar por enquanto",
            }),
            or: insert(
                t({
                    en: "{{first}} or {{second}}",
                    de: "{{first}} oder {{second}}",
                    es: "{{first}} o {{second}}",
                    fr: "{{first}} ou {{second}}",
                    pt: "{{first}} ou {{second}}",
                })
            ),
            orderTitle: insert(
                t({
                    en: "{{name}} first",
                    de: "{{name}} zuerst",
                    es: "{{name}} primero",
                    fr: "{{name}} en premier",
                    pt: "{{name}} primeiro",
                })
            ),
            save: t({
                en: "Save choice",
                de: "Auswahl speichern",
                es: "Guardar elección",
                fr: "Enregistrer le choix",
                pt: "Salvar escolha",
            }),
            secondLine: insert(
                t({
                    en: "These {{count}} entries move to {{category}}.",
                    de: "Diese {{count}} Einträge wechseln zu {{category}}.",
                    es: "Estos {{count}} movimientos pasan a {{category}}.",
                    fr: "Ces {{count}} opérations passent dans {{category}}.",
                    pt: "Estes {{count}} lançamentos passam para {{category}}.",
                })
            ),
            secondLineOne: insert(
                t({
                    en: "This entry moves to {{category}}.",
                    de: "Dieser Eintrag wechselt zu {{category}}.",
                    es: "Este movimiento pasa a {{category}}.",
                    fr: "Cette opération passe dans {{category}}.",
                    pt: "Este lançamento passa para {{category}}.",
                })
            ),
            skipLine: insert(
                t({
                    en: "Adds a condition to {{name}}, so it leaves these entries alone.",
                    de: "Fügt {{name}} eine Bedingung hinzu, damit die Regel diese Einträge in Ruhe lässt.",
                    es: "Agrega una condición a {{name}} para que no toque estos movimientos.",
                    fr: "Ajoute une condition à {{name}}, qui laisse alors ces opérations.",
                    pt: "Adiciona uma condição a {{name}}, que deixa de tocar nestes lançamentos.",
                })
            ),
            skipLineTags: insert(
                t({
                    en: "Adds a condition to {{name}}, so these entries get no {{tags}} tag.",
                    de: "Fügt {{name}} eine Bedingung hinzu, damit diese Einträge kein Tag {{tags}} bekommen.",
                    es: "Agrega una condición a {{name}}, así estos movimientos no reciben la etiqueta {{tags}}.",
                    fr: "Ajoute une condition à {{name}} : ces opérations ne reçoivent plus l'étiquette {{tags}}.",
                    pt: "Adiciona uma condição a {{name}}, e estes lançamentos não recebem a etiqueta {{tags}}.",
                })
            ),
            skipTitle: insert(
                t({
                    en: "Make {{name}} skip {{value}}",
                    de: "{{name}} bei {{value}} überspringen lassen",
                    es: "Hacer que {{name}} ignore {{value}}",
                    fr: "Faire ignorer {{value}} à {{name}}",
                    pt: "Fazer {{name}} ignorar {{value}}",
                })
            ),
            total: t({ en: "Total", de: "Gesamt", es: "Total", fr: "Total", pt: "Total" }),
        },
        copyOf: insert(
            t({
                en: "{{name}} copy",
                de: "{{name}} Kopie",
                es: "Copia de {{name}}",
                fr: "Copie de {{name}}",
                pt: "Cópia de {{name}}",
            })
        ),
        create: t({
            en: "Create rule",
            de: "Regel erstellen",
            es: "Crear regla",
            fr: "Créer une règle",
            pt: "Criar regra",
        }),
        deleteRule: {
            body: insert(
                t({
                    en: "Its {{count}} entries keep their categories. New ones won't match it.",
                    de: "Ihre {{count}} Einträge behalten ihre Kategorien. Neue passen nicht mehr dazu.",
                    es: "Sus {{count}} movimientos conservan sus categorías. Los nuevos ya no coincidirán.",
                    fr: "Ses {{count}} opérations gardent leur catégorie. Les nouvelles ne correspondront plus.",
                    pt: "Seus {{count}} lançamentos mantêm as categorias. Os novos não vão mais coincidir.",
                })
            ),
            bodyNone: t({
                en: "New entries won't match it.",
                de: "Neue Einträge passen nicht dazu.",
                es: "Los movimientos nuevos ya no coincidirán.",
                fr: "Les nouvelles opérations ne correspondront plus.",
                pt: "Os novos lançamentos não vão mais coincidir.",
            }),
            bodyOne: t({
                en: "Its entry keeps its category. New ones won't match it.",
                de: "Ihr Eintrag behält seine Kategorie. Neue passen nicht mehr dazu.",
                es: "Su movimiento conserva su categoría. Los nuevos ya no coincidirán.",
                fr: "Son opération garde sa catégorie. Les nouvelles ne correspondront plus.",
                pt: "Seu lançamento mantém a categoria. Os novos não vão mais coincidir.",
            }),
            confirm: t({
                en: "Delete rule",
                de: "Regel löschen",
                es: "Eliminar regla",
                fr: "Supprimer la règle",
                pt: "Excluir regra",
            }),
            title: insert(
                t({
                    en: "Delete {{name}}?",
                    de: "{{name}} löschen?",
                    es: "¿Eliminar {{name}}?",
                    fr: "Supprimer {{name}} ?",
                    pt: "Excluir {{name}}?",
                })
            ),
        },
        empty: {
            line: t({
                en: "Rules set a category or tag on entries that match, as they come in.",
                de: "Regeln setzen bei passenden Einträgen eine Kategorie oder ein Tag, sobald sie hereinkommen.",
                es: "Las reglas ponen una categoría o etiqueta a los movimientos que coinciden, apenas llegan.",
                fr: "Les règles posent une catégorie ou une étiquette sur les opérations qui correspondent, dès leur arrivée.",
                pt: "As regras colocam uma categoria ou etiqueta nos lançamentos que coincidem, assim que chegam.",
            }),
            see: insert(
                t({
                    en: "See {{count}} suggestions",
                    de: "{{count}} Vorschläge ansehen",
                    es: "Ver {{count}} sugerencias",
                    fr: "Voir {{count}} suggestions",
                    pt: "Ver {{count}} sugestões",
                })
            ),
            seeOne: t({
                en: "See 1 suggestion",
                de: "1 Vorschlag ansehen",
                es: "Ver 1 sugerencia",
                fr: "Voir 1 suggestion",
                pt: "Ver 1 sugestão",
            }),
            title: t({
                en: "No rules yet",
                de: "Noch keine Regeln",
                es: "Aún no hay reglas",
                fr: "Aucune règle",
                pt: "Nenhuma regra ainda",
            }),
        },
        fields: {
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            description: t({
                en: "Description",
                de: "Beschreibung",
                es: "Descripción",
                fr: "Description",
                pt: "Descrição",
            }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Marchand", pt: "Estabelecimento" }),
        },
        firstMatch: t({
            en: "First match wins per field",
            de: "Der erste Treffer gewinnt pro Feld",
            es: "La primera coincidencia gana en cada campo",
            fr: "La première correspondance l'emporte pour chaque champ",
            pt: "A primeira ocorrência vence em cada campo",
        }),
        footer: {
            count: insert(
                t({
                    en: "{{count}} rules",
                    de: "{{count}} Regeln",
                    es: "{{count}} reglas",
                    fr: "{{count}} règles",
                    pt: "{{count}} regras",
                })
            ),
            drag: t({
                en: "Drag to reorder",
                de: "Zum Neuordnen ziehen",
                es: "Arrastra para reordenar",
                fr: "Glissez pour réordonner",
                pt: "Arraste para reordenar",
            }),
            moving: insert(
                t({
                    en: "Moving {{name}} to {{position}}. Esc cancels.",
                    de: "{{name}} wird auf Position {{position}} verschoben. Mit Esc abbrechen.",
                    es: "Moviendo {{name}} a {{position}}. Esc cancela.",
                    fr: "Déplacement de {{name}} en {{position}}. Échap annule.",
                    pt: "Movendo {{name}} para {{position}}. Esc cancela.",
                })
            ),
            one: t({ en: "1 rule", de: "1 Regel", es: "1 regla", fr: "1 règle", pt: "1 regra" }),
        },
        kpi: {
            active: t({ en: "Active", de: "Aktiv", es: "Activas", fr: "Actives", pt: "Ativas" }),
            conflicts: t({ en: "Conflicts", de: "Konflikte", es: "Conflictos", fr: "Conflits", pt: "Conflitos" }),
            matches: t({ en: "Matches", de: "Treffer", es: "Coincidencias", fr: "Correspondances", pt: "Ocorrências" }),
            ofTotal: insert(
                t({
                    en: "of {{count}}",
                    de: "von {{count}}",
                    es: "de {{count}}",
                    fr: "sur {{count}}",
                    pt: "de {{count}}",
                })
            ),
            share: t({
                en: "Of your entries",
                de: "Deiner Einträge",
                es: "De tus movimientos",
                fr: "De vos opérations",
                pt: "Dos seus lançamentos",
            }),
        },
        menu: {
            delete: t({ en: "Delete", de: "Löschen", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            disable: t({ en: "Disable", de: "Deaktivieren", es: "Desactivar", fr: "Désactiver", pt: "Desativar" }),
            duplicate: t({ en: "Duplicate", de: "Duplizieren", es: "Duplicar", fr: "Dupliquer", pt: "Duplicar" }),
            edit: t({ en: "Edit", de: "Bearbeiten", es: "Editar", fr: "Modifier", pt: "Editar" }),
            enable: t({ en: "Enable", de: "Aktivieren", es: "Activar", fr: "Activer", pt: "Ativar" }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    de: "Mehr zu {{name}}",
                    es: "Más opciones de {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            move: insert(
                t({
                    en: "Move {{name}}",
                    de: "{{name}} verschieben",
                    es: "Mover {{name}}",
                    fr: "Déplacer {{name}}",
                    pt: "Mover {{name}}",
                })
            ),
            test: t({
                en: "Test against history",
                de: "Am Verlauf testen",
                es: "Probar con el historial",
                fr: "Tester sur l'historique",
                pt: "Testar no histórico",
            }),
            toggle: insert(
                t({
                    en: "{{name}} active",
                    de: "{{name}} aktiv",
                    es: "{{name}} activa",
                    fr: "{{name}} active",
                    pt: "{{name}} ativa",
                })
            ),
            top: t({
                en: "Move to top",
                de: "Nach oben",
                es: "Mover al inicio",
                fr: "Placer en premier",
                pt: "Mover para o topo",
            }),
        },
        ops: {
            atLeast: t({
                en: "is at least",
                de: "ist mindestens",
                es: "es al menos",
                fr: "est au moins",
                pt: "é pelo menos",
            }),
            atMost: t({
                en: "is at most",
                de: "ist höchstens",
                es: "es como máximo",
                fr: "est au plus",
                pt: "é no máximo",
            }),
            contains: t({ en: "contains", de: "enthält", es: "contiene", fr: "contient", pt: "contém" }),
            is: t({ en: "is", de: "ist", es: "es", fr: "est", pt: "é" }),
            notContains: t({
                en: "does not contain",
                de: "enthält nicht",
                es: "no contiene",
                fr: "ne contient pas",
                pt: "não contém",
            }),
            startsWith: t({
                en: "starts with",
                de: "beginnt mit",
                es: "empieza con",
                fr: "commence par",
                pt: "começa com",
            }),
        },
        run: {
            already: insert(
                t({
                    en: "Already {{category}}",
                    de: "Schon {{category}}",
                    es: "Ya en {{category}}",
                    fr: "Déjà {{category}}",
                    pt: "Já em {{category}}",
                })
            ),
            alreadyRight: t({
                en: "Already right",
                de: "Schon richtig",
                es: "Ya correctos",
                fr: "Déjà corrects",
                pt: "Já corretos",
            }),
            change: t({ en: "Change", de: "Ändern", es: "Cambian", fr: "À modifier", pt: "Mudam" }),
            changeTo: insert(
                t({
                    en: "Change to {{category}}",
                    de: "Auf {{category}} ändern",
                    es: "Pasan a {{category}}",
                    fr: "Passent dans {{category}}",
                    pt: "Passam para {{category}}",
                })
            ),
            confirm: insert(
                t({
                    en: "Change {{count}} entries",
                    de: "{{count}} Einträge ändern",
                    es: "Cambiar {{count}} movimientos",
                    fr: "Modifier {{count}} opérations",
                    pt: "Mudar {{count}} lançamentos",
                })
            ),
            confirmOne: t({
                en: "Change 1 entry",
                de: "1 Eintrag ändern",
                es: "Cambiar 1 movimiento",
                fr: "Modifier 1 opération",
                pt: "Mudar 1 lançamento",
            }),
            match: t({ en: "Match", de: "Treffer", es: "Coinciden", fr: "Correspondent", pt: "Coincidem" }),
            nothing: t({
                en: "Nothing to change",
                de: "Nichts zu ändern",
                es: "Nada que cambiar",
                fr: "Rien à modifier",
                pt: "Nada para mudar",
            }),
            skipped: t({ en: "Skipped", de: "Übersprungen", es: "Omitidos", fr: "Ignorées", pt: "Pulados" }),
            skip: t({
                en: "Skip entries that already have a category",
                de: "Einträge mit vorhandener Kategorie überspringen",
                es: "Omitir movimientos que ya tienen categoría",
                fr: "Ignorer les opérations déjà classées",
                pt: "Pular lançamentos que já têm categoria",
            }),
            title: insert(
                t({
                    en: "Run {{name}} on past entries",
                    de: "{{name}} auf frühere Einträge anwenden",
                    es: "Aplicar {{name}} a movimientos pasados",
                    fr: "Appliquer {{name}} aux opérations passées",
                    pt: "Aplicar {{name}} a lançamentos passados",
                })
            ),
            titleAll: insert(
                t({
                    en: "Run {{count}} rules on past entries",
                    de: "{{count}} Regeln auf frühere Einträge anwenden",
                    es: "Aplicar {{count}} reglas a movimientos pasados",
                    fr: "Appliquer {{count}} règles aux opérations passées",
                    pt: "Aplicar {{count}} regras a lançamentos passados",
                })
            ),
        },
        runPast: t({
            en: "Run on past entries",
            de: "Auf frühere Einträge anwenden",
            es: "Aplicar a movimientos pasados",
            fr: "Appliquer aux opérations passées",
            pt: "Aplicar a lançamentos passados",
        }),
        sheet: {
            addAction: t({
                en: "Add action",
                de: "Aktion hinzufügen",
                es: "Agregar acción",
                fr: "Ajouter une action",
                pt: "Adicionar ação",
            }),
            addCondition: t({
                en: "Add condition",
                de: "Bedingung hinzufügen",
                es: "Agregar condición",
                fr: "Ajouter une condition",
                pt: "Adicionar condição",
            }),
            addTag: t({
                en: "Add tag",
                de: "Tag hinzufügen",
                es: "Agregar etiqueta",
                fr: "Ajouter une étiquette",
                pt: "Adicionar etiqueta",
            }),
            all: t({ en: "All", de: "Alle", es: "Todas", fr: "Toutes", pt: "Todas" }),
            any: t({ en: "Any", de: "Eine", es: "Alguna", fr: "Une seule", pt: "Qualquer" }),
            delete: t({ en: "Delete", de: "Löschen", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            errors: {
                amount: t({
                    en: "Add an amount",
                    de: "Betrag angeben",
                    es: "Agrega un monto",
                    fr: "Ajoutez un montant",
                    pt: "Adicione um valor",
                }),
                category: t({
                    en: "Pick a category",
                    de: "Kategorie wählen",
                    es: "Elige una categoría",
                    fr: "Choisissez une catégorie",
                    pt: "Escolha uma categoria",
                }),
                fix: insert(
                    t({
                        en: "{{count}} things to fix",
                        de: "{{count}} Dinge zu beheben",
                        es: "{{count}} cosas por corregir",
                        fr: "{{count}} points à corriger",
                        pt: "{{count}} coisas para corrigir",
                    })
                ),
                fixOne: t({
                    en: "1 thing to fix",
                    de: "1 Ding zu beheben",
                    es: "1 cosa por corregir",
                    fr: "1 point à corriger",
                    pt: "1 coisa para corrigir",
                }),
                name: t({
                    en: "Add a name",
                    de: "Namen angeben",
                    es: "Agrega un nombre",
                    fr: "Ajoutez un nom",
                    pt: "Adicione um nome",
                }),
                none: t({
                    en: "Add a condition and an action",
                    de: "Bedingung und Aktion hinzufügen",
                    es: "Agrega una condición y una acción",
                    fr: "Ajoutez une condition et une action",
                    pt: "Adicione uma condição e uma ação",
                }),
                tag: t({
                    en: "Name the tag",
                    de: "Tag benennen",
                    es: "Nombra la etiqueta",
                    fr: "Nommez l'étiquette",
                    pt: "Dê um nome à etiqueta",
                }),
                text: t({
                    en: "Add some text",
                    de: "Text angeben",
                    es: "Agrega un texto",
                    fr: "Ajoutez un texte",
                    pt: "Adicione um texto",
                }),
            },
            first: t({ en: "First", de: "Zuerst", es: "Primera", fr: "Première", pt: "Primeira" }),
            lastAfter: insert(
                t({
                    en: "Last, after {{name}}",
                    de: "Zuletzt, nach {{name}}",
                    es: "Última, después de {{name}}",
                    fr: "Dernière, après {{name}}",
                    pt: "Última, depois de {{name}}",
                })
            ),
            matched: insert(
                t({
                    en: "Matched {{count}} entries, last on {{date}}",
                    de: "{{count}} Einträge getroffen, zuletzt am {{date}}",
                    es: "Coincidió con {{count}} movimientos, el último el {{date}}",
                    fr: "{{count}} opérations correspondantes, la dernière le {{date}}",
                    pt: "Coincidiu com {{count}} lançamentos, o último em {{date}}",
                })
            ),
            matchedOne: insert(
                t({
                    en: "Matched 1 entry, on {{date}}",
                    de: "1 Eintrag getroffen, am {{date}}",
                    es: "Coincidió con 1 movimiento, el {{date}}",
                    fr: "1 opération correspondante, le {{date}}",
                    pt: "Coincidiu com 1 lançamento, em {{date}}",
                })
            ),
            matchedNone: t({
                en: "No entries matched yet",
                de: "Noch keine Einträge getroffen",
                es: "Aún sin coincidencias",
                fr: "Aucune correspondance pour l'instant",
                pt: "Nenhuma ocorrência ainda",
            }),
            matchesNone: t({
                en: "Matches no past entries",
                de: "Trifft auf keinen früheren Eintrag zu",
                es: "No coincide con movimientos pasados",
                fr: "Aucune opération passée ne correspond",
                pt: "Não coincide com lançamentos passados",
            }),
            matchesPast: insert(
                t({
                    en: "Matches {{count}} past entries",
                    de: "Trifft auf {{count}} frühere Einträge zu",
                    es: "Coincide con {{count}} movimientos pasados",
                    fr: "Correspond à {{count}} opérations passées",
                    pt: "Coincide com {{count}} lançamentos passados",
                })
            ),
            matchesPastOne: t({
                en: "Matches 1 past entry",
                de: "Trifft auf 1 früheren Eintrag zu",
                es: "Coincide con 1 movimiento pasado",
                fr: "Correspond à 1 opération passée",
                pt: "Coincide com 1 lançamento passado",
            }),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            namePlaceholder: t({
                en: "Name this rule",
                de: "Regel benennen",
                es: "Ponle nombre a la regla",
                fr: "Nommez cette règle",
                pt: "Dê um nome à regra",
            }),
            on: t({ en: "On", de: "Aktiv", es: "Activa", fr: "Active", pt: "Ativa" }),
            pickCategory: t({
                en: "Pick a category",
                de: "Kategorie wählen",
                es: "Elige una categoría",
                fr: "Choisissez une catégorie",
                pt: "Escolha uma categoria",
            }),
            position: t({ en: "Position", de: "Position", es: "Posición", fr: "Position", pt: "Posição" }),
            positionOf: insert(
                t({
                    en: "{{position}} of {{count}}",
                    de: "{{position}} von {{count}}",
                    es: "{{position}} de {{count}}",
                    fr: "{{position}} sur {{count}}",
                    pt: "{{position}} de {{count}}",
                })
            ),
            removeAction: t({
                en: "Remove action",
                de: "Aktion entfernen",
                es: "Quitar acción",
                fr: "Retirer l'action",
                pt: "Remover ação",
            }),
            removeCondition: t({
                en: "Remove condition",
                de: "Bedingung entfernen",
                es: "Quitar condición",
                fr: "Retirer la condition",
                pt: "Remover condição",
            }),
            ruleTab: t({ en: "Rule", de: "Regel", es: "Regla", fr: "Règle", pt: "Regra" }),
            runToo: t({
                en: "Run on those entries too",
                de: "Auch auf diese Einträge anwenden",
                es: "Aplicar también a esos movimientos",
                fr: "Appliquer aussi à ces opérations",
                pt: "Aplicar também a esses lançamentos",
            }),
            runTooLine: t({
                en: "Otherwise it only touches new ones",
                de: "Sonst betrifft sie nur neue",
                es: "Si no, solo toca los nuevos",
                fr: "Sinon, seules les nouvelles sont concernées",
                pt: "Senão, só mexe nos novos",
            }),
            save: t({ en: "Save", de: "Speichern", es: "Guardar", fr: "Enregistrer", pt: "Salvar" }),
            setCategory: t({
                en: "Set category",
                de: "Kategorie festlegen",
                es: "Poner categoría",
                fr: "Définir la catégorie",
                pt: "Definir categoria",
            }),
            since: insert(
                t({
                    en: "{{total}} since {{month}}",
                    de: "{{total}} seit {{month}}",
                    es: "{{total}} desde {{month}}",
                    fr: "{{total}} depuis {{month}}",
                    pt: "{{total}} desde {{month}}",
                })
            ),
            tagPlaceholder: t({
                en: "Tag name",
                de: "Tag-Name",
                es: "Nombre de la etiqueta",
                fr: "Nom de l'étiquette",
                pt: "Nome da etiqueta",
            }),
            test: t({ en: "Test", de: "Test", es: "Probar", fr: "Tester", pt: "Testar" }),
            valuePlaceholder: t({
                en: "Text to match",
                de: "Zu findender Text",
                es: "Texto a buscar",
                fr: "Texte à trouver",
                pt: "Texto a buscar",
            }),
        },
        suggested: {
            add: t({
                en: "Add rule",
                de: "Regel hinzufügen",
                es: "Agregar regla",
                fr: "Ajouter la règle",
                pt: "Adicionar regra",
            }),
            dismiss: t({ en: "Dismiss", de: "Verwerfen", es: "Descartar", fr: "Ignorer", pt: "Dispensar" }),
            emptyLine: t({
                en: "File a merchant under the same category a few times and it shows up here.",
                de: "Erfasse einen Händler ein paarmal in derselben Kategorie, dann erscheint er hier.",
                es: "Pon un comercio en la misma categoría unas cuantas veces y aparecerá aquí.",
                fr: "Classez un marchand plusieurs fois dans la même catégorie et il apparaît ici.",
                pt: "Coloque um estabelecimento na mesma categoria algumas vezes e ele aparece aqui.",
            }),
            emptyTitle: t({
                en: "No suggestions",
                de: "Keine Vorschläge",
                es: "Sin sugerencias",
                fr: "Aucune suggestion",
                pt: "Sem sugestões",
            }),
            footer: t({
                en: "Found in entries you categorized yourself",
                de: "Gefunden in Einträgen, die du selbst kategorisiert hast",
                es: "Encontradas en movimientos que tú categorizaste",
                fr: "Trouvées dans les opérations que vous avez classées",
                pt: "Encontradas em lançamentos que você categorizou",
            }),
            pickedOf: insert(
                t({
                    en: "{{picked}} of {{total}}",
                    de: "{{picked}} von {{total}}",
                    es: "{{picked}} de {{total}}",
                    fr: "{{picked}} sur {{total}}",
                    pt: "{{picked}} de {{total}}",
                })
            ),
        },
        tabs: {
            all: t({ en: "All", de: "Alle", es: "Todas", fr: "Toutes", pt: "Todas" }),
            conflicts: t({ en: "Conflicts", de: "Konflikte", es: "Conflictos", fr: "Conflits", pt: "Conflitos" }),
            suggested: t({ en: "Suggested", de: "Vorgeschlagen", es: "Sugeridas", fr: "Suggérées", pt: "Sugeridas" }),
        },
        test: {
            back: t({
                en: "Back to rule",
                de: "Zurück zur Regel",
                es: "Volver a la regla",
                fr: "Retour à la règle",
                pt: "Voltar à regra",
            }),
            emptyHas: insert(
                t({
                    en: "It would still run on new ones. Nothing in {{count}} entries has {{value}} in the {{field}}.",
                    de: "Sie würde weiterhin auf neue Einträge angewendet. In {{count}} Einträgen kommt {{value}} im Feld {{field}} nicht vor.",
                    es: "Igual se aplicaría a los nuevos. Ninguno de {{count}} movimientos tiene {{value}} en {{field}}.",
                    fr: "Elle s'appliquerait quand même aux nouvelles. Aucune des {{count}} opérations n'a {{value}} dans {{field}}.",
                    pt: "Ela ainda valeria para os novos. Nenhum de {{count}} lançamentos tem {{value}} em {{field}}.",
                })
            ),
            emptyLine: insert(
                t({
                    en: "It would still run on new ones. Nothing in {{count}} entries matches.",
                    de: "Sie würde weiterhin auf neue Einträge angewendet. Keiner von {{count}} Einträgen passt.",
                    es: "Igual se aplicaría a los nuevos. Ninguno de {{count}} movimientos coincide.",
                    fr: "Elle s'appliquerait quand même aux nouvelles. Aucune des {{count}} opérations ne correspond.",
                    pt: "Ela ainda valeria para os novos. Nenhum de {{count}} lançamentos coincide.",
                })
            ),
            emptyTitle: t({
                en: "No past entries match",
                de: "Keine früheren Einträge passen",
                es: "Ningún movimiento pasado coincide",
                fr: "Aucune opération passée ne correspond",
                pt: "Nenhum lançamento passado coincide",
            }),
            entries: insert(
                t({
                    en: "{{count}} entries",
                    de: "{{count}} Einträge",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            entriesOne: t({
                en: "1 entry",
                de: "1 Eintrag",
                es: "1 movimiento",
                fr: "1 opération",
                pt: "1 lançamento",
            }),
            fieldDescription: t({
                en: "description",
                de: "Beschreibung",
                es: "la descripción",
                fr: "la description",
                pt: "a descrição",
            }),
            fieldMerchant: t({
                en: "merchant",
                de: "Händler",
                es: "el comercio",
                fr: "le marchand",
                pt: "o estabelecimento",
            }),
            match: t({ en: "Match", de: "Treffer", es: "Coinciden", fr: "Correspondent", pt: "Coincidem" }),
            noCategory: t({
                en: "No category",
                de: "Keine Kategorie",
                es: "Sin categoría",
                fr: "Sans catégorie",
                pt: "Sem categoria",
            }),
            noChange: t({ en: "No change", de: "Keine Änderung", es: "Sin cambio", fr: "Inchangé", pt: "Sem mudança" }),
            tab: t({ en: "Test", de: "Test", es: "Prueba", fr: "Test", pt: "Teste" }),
            total: t({ en: "Total", de: "Gesamt", es: "Total", fr: "Total", pt: "Total" }),
            wouldChange: t({
                en: "Would change",
                de: "Würde ändern",
                es: "Cambiarían",
                fr: "Changeraient",
                pt: "Mudariam",
            }),
        },
        title: t({ en: "Rules", de: "Regeln", es: "Reglas", fr: "Règles", pt: "Regras" }),
        toast: {
            changed: insert(
                t({
                    en: "{{count}} entries changed",
                    de: "{{count}} Einträge geändert",
                    es: "{{count}} movimientos cambiados",
                    fr: "{{count}} opérations modifiées",
                    pt: "{{count}} lançamentos alterados",
                })
            ),
            changedOne: t({
                en: "1 entry changed",
                de: "1 Eintrag geändert",
                es: "1 movimiento cambiado",
                fr: "1 opération modifiée",
                pt: "1 lançamento alterado",
            }),
            deleted: insert(
                t({
                    en: "{{name}} deleted",
                    de: "{{name}} gelöscht",
                    es: "{{name}} eliminada",
                    fr: "{{name}} supprimée",
                    pt: "{{name}} excluída",
                })
            ),
            moved: insert(
                t({
                    en: "{{count}} entries moved to {{category}}",
                    de: "{{count}} Einträge nach {{category}} verschoben",
                    es: "{{count}} movimientos pasaron a {{category}}",
                    fr: "{{count}} opérations déplacées vers {{category}}",
                    pt: "{{count}} lançamentos foram para {{category}}",
                })
            ),
            movedOne: insert(
                t({
                    en: "1 entry moved to {{category}}",
                    de: "1 Eintrag nach {{category}} verschoben",
                    es: "1 movimiento pasó a {{category}}",
                    fr: "1 opération déplacée vers {{category}}",
                    pt: "1 lançamento foi para {{category}}",
                })
            ),
            off: insert(
                t({
                    en: "{{name}} is off. Its {{count}} entries keep their categories.",
                    de: "{{name}} ist aus. Ihre {{count}} Einträge behalten ihre Kategorien.",
                    es: "{{name}} está desactivada. Sus {{count}} movimientos conservan sus categorías.",
                    fr: "{{name}} est désactivée. Ses {{count}} opérations gardent leur catégorie.",
                    pt: "{{name}} está desativada. Seus {{count}} lançamentos mantêm as categorias.",
                })
            ),
            offNone: insert(
                t({
                    en: "{{name}} is off.",
                    de: "{{name}} ist aus.",
                    es: "{{name}} está desactivada.",
                    fr: "{{name}} est désactivée.",
                    pt: "{{name}} está desativada.",
                })
            ),
            offOne: insert(
                t({
                    en: "{{name}} is off. Its entry keeps its category.",
                    de: "{{name}} ist aus. Ihr Eintrag behält seine Kategorie.",
                    es: "{{name}} está desactivada. Su movimiento conserva su categoría.",
                    fr: "{{name}} est désactivée. Son opération garde sa catégorie.",
                    pt: "{{name}} está desativada. Seu lançamento mantém a categoria.",
                })
            ),
            saveFailed: t({
                en: "Could not save. Try again.",
                de: "Das Speichern hat nicht geklappt. Versuch es noch mal.",
                es: "No se pudo guardar. Intenta de nuevo.",
                fr: "Échec de l'enregistrement. Réessayez.",
                pt: "Não foi possível salvar. Tente de novo.",
            }),
        },
    },
    key: "dashboard-rules",
} satisfies Dictionary;

export default dashboardRules;
