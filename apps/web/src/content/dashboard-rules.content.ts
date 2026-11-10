import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardRules = {
    content: {
        cancel: t({ en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        close: t({ en: "Close", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
        columns: {
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            becomes: t({ en: "Becomes", es: "Pasa a", fr: "Devient", pt: "Passa a" }),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            description: t({ en: "Description", es: "Descripción", fr: "Description", pt: "Descrição" }),
            entries: t({ en: "Entries", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            entry: t({ en: "Entry", es: "Movimiento", fr: "Opération", pt: "Lançamento" }),
            lastMatch: t({
                en: "Last match",
                es: "Última coincidencia",
                fr: "Dernière correspondance",
                pt: "Última ocorrência",
            }),
            matches: t({ en: "Matches", es: "Coincidencias", fr: "Correspondances", pt: "Ocorrências" }),
            now: t({ en: "Now", es: "Ahora", fr: "Actuel", pt: "Agora" }),
            on: t({ en: "On", es: "Activa", fr: "Active", pt: "Ativa" }),
            order: t({ en: "Order", es: "Orden", fr: "Ordre", pt: "Ordem" }),
            picked: t({ en: "You picked it", es: "La elegiste", fr: "Votre choix", pt: "Você escolheu" }),
            result: t({ en: "Result", es: "Resultado", fr: "Résultat", pt: "Resultado" }),
            rule: t({ en: "Rule", es: "Regla", fr: "Règle", pt: "Regra" }),
            outcome: t({ en: "Then", es: "Entonces", fr: "Alors", pt: "Então" }),
            when: t({ en: "When", es: "Cuando", fr: "Quand", pt: "Quando" }),
        },
        conflicts: {
            both: insert(
                t({
                    en: "{{first}} and {{second}} both match {{count}} entries",
                    es: "{{first}} y {{second}} coinciden en {{count}} movimientos",
                    fr: "{{first}} et {{second}} correspondent à {{count}} opérations",
                    pt: "{{first}} e {{second}} coincidem em {{count}} lançamentos",
                })
            ),
            bothOne: insert(
                t({
                    en: "{{first}} and {{second}} both match 1 entry",
                    es: "{{first}} y {{second}} coinciden en 1 movimiento",
                    fr: "{{first}} et {{second}} correspondent à 1 opération",
                    pt: "{{first}} e {{second}} coincidem em 1 lançamento",
                })
            ),
            emptyLine: t({
                en: "Two rules that file the same entries under different categories show up here.",
                es: "Aquí aparecen dos reglas que mandan los mismos movimientos a categorías distintas.",
                fr: "Deux règles qui classent les mêmes opérations dans des catégories différentes apparaissent ici.",
                pt: "Duas regras que mandam os mesmos lançamentos para categorias diferentes aparecem aqui.",
            }),
            emptyTitle: t({ en: "No conflicts", es: "Sin conflictos", fr: "Aucun conflit", pt: "Sem conflitos" }),
            firstLine: insert(
                t({
                    en: "Keeps today's result. {{category}} from {{first}}.",
                    es: "Mantiene el resultado de hoy. {{category}} por {{first}}.",
                    fr: "Garde le résultat actuel. {{category}} par {{first}}.",
                    pt: "Mantém o resultado de hoje. {{category}} por {{first}}.",
                })
            ),
            firstLineTags: insert(
                t({
                    en: "Keeps today's result. {{category}} from {{first}}, the {{tags}} tag from {{second}}.",
                    es: "Mantiene el resultado de hoy. {{category}} por {{first}}, la etiqueta {{tags}} por {{second}}.",
                    fr: "Garde le résultat actuel. {{category}} par {{first}}, l'étiquette {{tags}} par {{second}}.",
                    pt: "Mantém o resultado de hoje. {{category}} por {{first}}, a etiqueta {{tags}} por {{second}}.",
                })
            ),
            leaveLine: t({
                en: "Stays in Conflicts.",
                es: "Se queda en Conflictos.",
                fr: "Reste dans Conflits.",
                pt: "Continua em Conflitos.",
            }),
            leaveTitle: t({
                en: "Leave it for now",
                es: "Dejarlo por ahora",
                fr: "Laisser pour l'instant",
                pt: "Deixar por enquanto",
            }),
            or: insert(
                t({
                    en: "{{first}} or {{second}}",
                    es: "{{first}} o {{second}}",
                    fr: "{{first}} ou {{second}}",
                    pt: "{{first}} ou {{second}}",
                })
            ),
            orderTitle: insert(
                t({ en: "{{name}} first", es: "{{name}} primero", fr: "{{name}} en premier", pt: "{{name}} primeiro" })
            ),
            save: t({ en: "Save choice", es: "Guardar elección", fr: "Enregistrer le choix", pt: "Salvar escolha" }),
            secondLine: insert(
                t({
                    en: "These {{count}} entries move to {{category}}.",
                    es: "Estos {{count}} movimientos pasan a {{category}}.",
                    fr: "Ces {{count}} opérations passent dans {{category}}.",
                    pt: "Estes {{count}} lançamentos passam para {{category}}.",
                })
            ),
            skipLine: insert(
                t({
                    en: "Adds a condition to {{name}}, so it leaves these entries alone.",
                    es: "Agrega una condición a {{name}} para que no toque estos movimientos.",
                    fr: "Ajoute une condition à {{name}}, qui laisse alors ces opérations.",
                    pt: "Adiciona uma condição a {{name}}, que deixa de tocar nestes lançamentos.",
                })
            ),
            skipLineTags: insert(
                t({
                    en: "Adds a condition to {{name}}, so these entries get no {{tags}} tag.",
                    es: "Agrega una condición a {{name}}, así estos movimientos no reciben la etiqueta {{tags}}.",
                    fr: "Ajoute une condition à {{name}} : ces opérations ne reçoivent plus l'étiquette {{tags}}.",
                    pt: "Adiciona uma condição a {{name}}, e estes lançamentos não recebem a etiqueta {{tags}}.",
                })
            ),
            skipTitle: insert(
                t({
                    en: "Make {{name}} skip {{value}}",
                    es: "Hacer que {{name}} ignore {{value}}",
                    fr: "Faire ignorer {{value}} à {{name}}",
                    pt: "Fazer {{name}} ignorar {{value}}",
                })
            ),
            total: t({ en: "Total", es: "Total", fr: "Total", pt: "Total" }),
        },
        copyOf: insert(
            t({ en: "{{name}} copy", es: "Copia de {{name}}", fr: "Copie de {{name}}", pt: "Cópia de {{name}}" })
        ),
        create: t({ en: "Create rule", es: "Crear regla", fr: "Créer une règle", pt: "Criar regra" }),
        deleteRule: {
            body: insert(
                t({
                    en: "Its {{count}} entries keep their categories. New ones won't match it.",
                    es: "Sus {{count}} movimientos conservan sus categorías. Los nuevos ya no coincidirán.",
                    fr: "Ses {{count}} opérations gardent leur catégorie. Les nouvelles ne correspondront plus.",
                    pt: "Seus {{count}} lançamentos mantêm as categorias. Os novos não vão mais coincidir.",
                })
            ),
            confirm: t({ en: "Delete rule", es: "Eliminar regla", fr: "Supprimer la règle", pt: "Excluir regra" }),
            title: insert(
                t({
                    en: "Delete {{name}}?",
                    es: "¿Eliminar {{name}}?",
                    fr: "Supprimer {{name}} ?",
                    pt: "Excluir {{name}}?",
                })
            ),
        },
        empty: {
            line: t({
                en: "Rules set a category or tag on entries that match, as they come in.",
                es: "Las reglas ponen una categoría o etiqueta a los movimientos que coinciden, apenas llegan.",
                fr: "Les règles posent une catégorie ou une étiquette sur les opérations qui correspondent, dès leur arrivée.",
                pt: "As regras colocam uma categoria ou etiqueta nos lançamentos que coincidem, assim que chegam.",
            }),
            see: insert(
                t({
                    en: "See {{count}} suggestions",
                    es: "Ver {{count}} sugerencias",
                    fr: "Voir {{count}} suggestions",
                    pt: "Ver {{count}} sugestões",
                })
            ),
            seeOne: t({
                en: "See 1 suggestion",
                es: "Ver 1 sugerencia",
                fr: "Voir 1 suggestion",
                pt: "Ver 1 sugestão",
            }),
            title: t({ en: "No rules yet", es: "Aún no hay reglas", fr: "Aucune règle", pt: "Nenhuma regra ainda" }),
        },
        fields: {
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            description: t({ en: "Description", es: "Descripción", fr: "Description", pt: "Descrição" }),
            merchant: t({ en: "Merchant", es: "Comercio", fr: "Marchand", pt: "Estabelecimento" }),
        },
        firstMatch: t({
            en: "First match wins per field",
            es: "La primera coincidencia gana en cada campo",
            fr: "La première correspondance l'emporte pour chaque champ",
            pt: "A primeira ocorrência vence em cada campo",
        }),
        footer: {
            count: insert(
                t({ en: "{{count}} rules", es: "{{count}} reglas", fr: "{{count}} règles", pt: "{{count}} regras" })
            ),
            drag: t({
                en: "Drag to reorder",
                es: "Arrastra para reordenar",
                fr: "Glissez pour réordonner",
                pt: "Arraste para reordenar",
            }),
            moving: insert(
                t({
                    en: "Moving {{name}} to {{position}}. Esc cancels.",
                    es: "Moviendo {{name}} a {{position}}. Esc cancela.",
                    fr: "Déplacement de {{name}} en {{position}}. Échap annule.",
                    pt: "Movendo {{name}} para {{position}}. Esc cancela.",
                })
            ),
            one: t({ en: "1 rule", es: "1 regla", fr: "1 règle", pt: "1 regra" }),
        },
        kpi: {
            active: t({ en: "Active", es: "Activas", fr: "Actives", pt: "Ativas" }),
            conflicts: t({ en: "Conflicts", es: "Conflictos", fr: "Conflits", pt: "Conflitos" }),
            matches: t({ en: "Matches", es: "Coincidencias", fr: "Correspondances", pt: "Ocorrências" }),
            ofTotal: insert(t({ en: "of {{count}}", es: "de {{count}}", fr: "sur {{count}}", pt: "de {{count}}" })),
            share: t({
                en: "Of your entries",
                es: "De tus movimientos",
                fr: "De vos opérations",
                pt: "Dos seus lançamentos",
            }),
        },
        menu: {
            delete: t({ en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            disable: t({ en: "Disable", es: "Desactivar", fr: "Désactiver", pt: "Desativar" }),
            duplicate: t({ en: "Duplicate", es: "Duplicar", fr: "Dupliquer", pt: "Duplicar" }),
            edit: t({ en: "Edit", es: "Editar", fr: "Modifier", pt: "Editar" }),
            enable: t({ en: "Enable", es: "Activar", fr: "Activer", pt: "Ativar" }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    es: "Más opciones de {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            move: insert(
                t({ en: "Move {{name}}", es: "Mover {{name}}", fr: "Déplacer {{name}}", pt: "Mover {{name}}" })
            ),
            test: t({
                en: "Test against history",
                es: "Probar con el historial",
                fr: "Tester sur l'historique",
                pt: "Testar no histórico",
            }),
            toggle: insert(
                t({
                    en: "{{name}} active",
                    es: "{{name}} activa",
                    fr: "{{name}} active",
                    pt: "{{name}} ativa",
                })
            ),
            top: t({ en: "Move to top", es: "Mover al inicio", fr: "Placer en premier", pt: "Mover para o topo" }),
        },
        ops: {
            atLeast: t({ en: "is at least", es: "es al menos", fr: "est au moins", pt: "é pelo menos" }),
            atMost: t({ en: "is at most", es: "es como máximo", fr: "est au plus", pt: "é no máximo" }),
            contains: t({ en: "contains", es: "contiene", fr: "contient", pt: "contém" }),
            is: t({ en: "is", es: "es", fr: "est", pt: "é" }),
            notContains: t({
                en: "does not contain",
                es: "no contiene",
                fr: "ne contient pas",
                pt: "não contém",
            }),
            startsWith: t({ en: "starts with", es: "empieza con", fr: "commence par", pt: "começa com" }),
        },
        run: {
            already: insert(
                t({
                    en: "Already {{category}}",
                    es: "Ya en {{category}}",
                    fr: "Déjà {{category}}",
                    pt: "Já em {{category}}",
                })
            ),
            alreadyRight: t({ en: "Already right", es: "Ya correctos", fr: "Déjà corrects", pt: "Já corretos" }),
            change: t({ en: "Change", es: "Cambian", fr: "À modifier", pt: "Mudam" }),
            changeTo: insert(
                t({
                    en: "Change to {{category}}",
                    es: "Pasan a {{category}}",
                    fr: "Passent dans {{category}}",
                    pt: "Passam para {{category}}",
                })
            ),
            confirm: insert(
                t({
                    en: "Change {{count}} entries",
                    es: "Cambiar {{count}} movimientos",
                    fr: "Modifier {{count}} opérations",
                    pt: "Mudar {{count}} lançamentos",
                })
            ),
            confirmOne: t({
                en: "Change 1 entry",
                es: "Cambiar 1 movimiento",
                fr: "Modifier 1 opération",
                pt: "Mudar 1 lançamento",
            }),
            match: t({ en: "Match", es: "Coinciden", fr: "Correspondent", pt: "Coincidem" }),
            nothing: t({
                en: "Nothing to change",
                es: "Nada que cambiar",
                fr: "Rien à modifier",
                pt: "Nada para mudar",
            }),
            skipped: t({ en: "Skipped", es: "Omitidos", fr: "Ignorées", pt: "Pulados" }),
            skip: t({
                en: "Skip entries that already have a category",
                es: "Omitir movimientos que ya tienen categoría",
                fr: "Ignorer les opérations déjà classées",
                pt: "Pular lançamentos que já têm categoria",
            }),
            title: insert(
                t({
                    en: "Run {{name}} on past entries",
                    es: "Aplicar {{name}} a movimientos pasados",
                    fr: "Appliquer {{name}} aux opérations passées",
                    pt: "Aplicar {{name}} a lançamentos passados",
                })
            ),
            titleAll: insert(
                t({
                    en: "Run {{count}} rules on past entries",
                    es: "Aplicar {{count}} reglas a movimientos pasados",
                    fr: "Appliquer {{count}} règles aux opérations passées",
                    pt: "Aplicar {{count}} regras a lançamentos passados",
                })
            ),
        },
        runPast: t({
            en: "Run on past entries",
            es: "Aplicar a movimientos pasados",
            fr: "Appliquer aux opérations passées",
            pt: "Aplicar a lançamentos passados",
        }),
        sheet: {
            addAction: t({ en: "Add action", es: "Agregar acción", fr: "Ajouter une action", pt: "Adicionar ação" }),
            addCondition: t({
                en: "Add condition",
                es: "Agregar condición",
                fr: "Ajouter une condition",
                pt: "Adicionar condição",
            }),
            addTag: t({ en: "Add tag", es: "Agregar etiqueta", fr: "Ajouter une étiquette", pt: "Adicionar etiqueta" }),
            all: t({ en: "All", es: "Todas", fr: "Toutes", pt: "Todas" }),
            any: t({ en: "Any", es: "Alguna", fr: "Une seule", pt: "Qualquer" }),
            delete: t({ en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            errors: {
                amount: t({
                    en: "Add an amount",
                    es: "Agrega un monto",
                    fr: "Ajoutez un montant",
                    pt: "Adicione um valor",
                }),
                category: t({
                    en: "Pick a category",
                    es: "Elige una categoría",
                    fr: "Choisissez une catégorie",
                    pt: "Escolha uma categoria",
                }),
                fix: insert(
                    t({
                        en: "{{count}} things to fix",
                        es: "{{count}} cosas por corregir",
                        fr: "{{count}} points à corriger",
                        pt: "{{count}} coisas para corrigir",
                    })
                ),
                fixOne: t({
                    en: "1 thing to fix",
                    es: "1 cosa por corregir",
                    fr: "1 point à corriger",
                    pt: "1 coisa para corrigir",
                }),
                name: t({ en: "Add a name", es: "Agrega un nombre", fr: "Ajoutez un nom", pt: "Adicione um nome" }),
                none: t({
                    en: "Add a condition and an action",
                    es: "Agrega una condición y una acción",
                    fr: "Ajoutez une condition et une action",
                    pt: "Adicione uma condição e uma ação",
                }),
                tag: t({
                    en: "Name the tag",
                    es: "Nombra la etiqueta",
                    fr: "Nommez l'étiquette",
                    pt: "Dê um nome à etiqueta",
                }),
                text: t({
                    en: "Add some text",
                    es: "Agrega un texto",
                    fr: "Ajoutez un texte",
                    pt: "Adicione um texto",
                }),
            },
            first: t({ en: "First", es: "Primera", fr: "Première", pt: "Primeira" }),
            lastAfter: insert(
                t({
                    en: "Last, after {{name}}",
                    es: "Última, después de {{name}}",
                    fr: "Dernière, après {{name}}",
                    pt: "Última, depois de {{name}}",
                })
            ),
            matched: insert(
                t({
                    en: "Matched {{count}} entries, last on {{date}}",
                    es: "Coincidió con {{count}} movimientos, el último el {{date}}",
                    fr: "{{count}} opérations correspondantes, la dernière le {{date}}",
                    pt: "Coincidiu com {{count}} lançamentos, o último em {{date}}",
                })
            ),
            matchedNone: t({
                en: "No entries matched yet",
                es: "Aún sin coincidencias",
                fr: "Aucune correspondance pour l'instant",
                pt: "Nenhuma ocorrência ainda",
            }),
            matchesNone: t({
                en: "Matches no past entries",
                es: "No coincide con movimientos pasados",
                fr: "Aucune opération passée ne correspond",
                pt: "Não coincide com lançamentos passados",
            }),
            matchesPast: insert(
                t({
                    en: "Matches {{count}} past entries",
                    es: "Coincide con {{count}} movimientos pasados",
                    fr: "Correspond à {{count}} opérations passées",
                    pt: "Coincide com {{count}} lançamentos passados",
                })
            ),
            matchesPastOne: t({
                en: "Matches 1 past entry",
                es: "Coincide con 1 movimiento pasado",
                fr: "Correspond à 1 opération passée",
                pt: "Coincide com 1 lançamento passado",
            }),
            name: t({ en: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            namePlaceholder: t({
                en: "Name this rule",
                es: "Ponle nombre a la regla",
                fr: "Nommez cette règle",
                pt: "Dê um nome à regra",
            }),
            on: t({ en: "On", es: "Activa", fr: "Active", pt: "Ativa" }),
            pickCategory: t({
                en: "Pick a category",
                es: "Elige una categoría",
                fr: "Choisissez une catégorie",
                pt: "Escolha uma categoria",
            }),
            position: t({ en: "Position", es: "Posición", fr: "Position", pt: "Posição" }),
            positionOf: insert(
                t({
                    en: "{{position}} of {{count}}",
                    es: "{{position}} de {{count}}",
                    fr: "{{position}} sur {{count}}",
                    pt: "{{position}} de {{count}}",
                })
            ),
            removeAction: t({ en: "Remove action", es: "Quitar acción", fr: "Retirer l'action", pt: "Remover ação" }),
            removeCondition: t({
                en: "Remove condition",
                es: "Quitar condición",
                fr: "Retirer la condition",
                pt: "Remover condição",
            }),
            ruleTab: t({ en: "Rule", es: "Regla", fr: "Règle", pt: "Regra" }),
            runToo: t({
                en: "Run on those entries too",
                es: "Aplicar también a esos movimientos",
                fr: "Appliquer aussi à ces opérations",
                pt: "Aplicar também a esses lançamentos",
            }),
            runTooLine: t({
                en: "Otherwise it only touches new ones",
                es: "Si no, solo toca los nuevos",
                fr: "Sinon, seules les nouvelles sont concernées",
                pt: "Senão, só mexe nos novos",
            }),
            save: t({ en: "Save", es: "Guardar", fr: "Enregistrer", pt: "Salvar" }),
            setCategory: t({
                en: "Set category",
                es: "Poner categoría",
                fr: "Définir la catégorie",
                pt: "Definir categoria",
            }),
            since: insert(
                t({
                    en: "{{total}} since {{month}}",
                    es: "{{total}} desde {{month}}",
                    fr: "{{total}} depuis {{month}}",
                    pt: "{{total}} desde {{month}}",
                })
            ),
            tagPlaceholder: t({
                en: "Tag name",
                es: "Nombre de la etiqueta",
                fr: "Nom de l'étiquette",
                pt: "Nome da etiqueta",
            }),
            test: t({ en: "Test", es: "Probar", fr: "Tester", pt: "Testar" }),
            valuePlaceholder: t({
                en: "Text to match",
                es: "Texto a buscar",
                fr: "Texte à trouver",
                pt: "Texto a buscar",
            }),
        },
        suggested: {
            add: t({ en: "Add rule", es: "Agregar regla", fr: "Ajouter la règle", pt: "Adicionar regra" }),
            dismiss: t({ en: "Dismiss", es: "Descartar", fr: "Ignorer", pt: "Dispensar" }),
            emptyLine: t({
                en: "File a merchant under the same category a few times and it shows up here.",
                es: "Pon un comercio en la misma categoría unas cuantas veces y aparecerá aquí.",
                fr: "Classez un marchand plusieurs fois dans la même catégorie et il apparaît ici.",
                pt: "Coloque um estabelecimento na mesma categoria algumas vezes e ele aparece aqui.",
            }),
            emptyTitle: t({
                en: "No suggestions",
                es: "Sin sugerencias",
                fr: "Aucune suggestion",
                pt: "Sem sugestões",
            }),
            footer: t({
                en: "Found in entries you categorized yourself",
                es: "Encontradas en movimientos que tú categorizaste",
                fr: "Trouvées dans les opérations que vous avez classées",
                pt: "Encontradas em lançamentos que você categorizou",
            }),
            pickedOf: insert(
                t({
                    en: "{{picked}} of {{total}}",
                    es: "{{picked}} de {{total}}",
                    fr: "{{picked}} sur {{total}}",
                    pt: "{{picked}} de {{total}}",
                })
            ),
        },
        tabs: {
            all: t({ en: "All", es: "Todas", fr: "Toutes", pt: "Todas" }),
            conflicts: t({ en: "Conflicts", es: "Conflictos", fr: "Conflits", pt: "Conflitos" }),
            suggested: t({ en: "Suggested", es: "Sugeridas", fr: "Suggérées", pt: "Sugeridas" }),
        },
        test: {
            back: t({ en: "Back to rule", es: "Volver a la regla", fr: "Retour à la règle", pt: "Voltar à regra" }),
            emptyHas: insert(
                t({
                    en: "It would still run on new ones. Nothing in {{count}} entries has {{value}} in the {{field}}.",
                    es: "Igual se aplicaría a los nuevos. Ninguno de {{count}} movimientos tiene {{value}} en {{field}}.",
                    fr: "Elle s'appliquerait quand même aux nouvelles. Aucune des {{count}} opérations n'a {{value}} dans {{field}}.",
                    pt: "Ela ainda valeria para os novos. Nenhum de {{count}} lançamentos tem {{value}} em {{field}}.",
                })
            ),
            emptyLine: insert(
                t({
                    en: "It would still run on new ones. Nothing in {{count}} entries matches.",
                    es: "Igual se aplicaría a los nuevos. Ninguno de {{count}} movimientos coincide.",
                    fr: "Elle s'appliquerait quand même aux nouvelles. Aucune des {{count}} opérations ne correspond.",
                    pt: "Ela ainda valeria para os novos. Nenhum de {{count}} lançamentos coincide.",
                })
            ),
            emptyTitle: t({
                en: "No past entries match",
                es: "Ningún movimiento pasado coincide",
                fr: "Aucune opération passée ne correspond",
                pt: "Nenhum lançamento passado coincide",
            }),
            entries: insert(
                t({
                    en: "{{count}} entries",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            entriesOne: t({ en: "1 entry", es: "1 movimiento", fr: "1 opération", pt: "1 lançamento" }),
            fieldDescription: t({ en: "description", es: "la descripción", fr: "la description", pt: "a descrição" }),
            fieldMerchant: t({ en: "merchant", es: "el comercio", fr: "le marchand", pt: "o estabelecimento" }),
            match: t({ en: "Match", es: "Coinciden", fr: "Correspondent", pt: "Coincidem" }),
            noCategory: t({ en: "No category", es: "Sin categoría", fr: "Sans catégorie", pt: "Sem categoria" }),
            noChange: t({ en: "No change", es: "Sin cambio", fr: "Inchangé", pt: "Sem mudança" }),
            tab: t({ en: "Test", es: "Prueba", fr: "Test", pt: "Teste" }),
            total: t({ en: "Total", es: "Total", fr: "Total", pt: "Total" }),
            wouldChange: t({ en: "Would change", es: "Cambiarían", fr: "Changeraient", pt: "Mudariam" }),
        },
        title: t({ en: "Rules", es: "Reglas", fr: "Règles", pt: "Regras" }),
        toast: {
            changed: insert(
                t({
                    en: "{{count}} entries changed",
                    es: "{{count}} movimientos cambiados",
                    fr: "{{count}} opérations modifiées",
                    pt: "{{count}} lançamentos alterados",
                })
            ),
            changedOne: t({
                en: "1 entry changed",
                es: "1 movimiento cambiado",
                fr: "1 opération modifiée",
                pt: "1 lançamento alterado",
            }),
            deleted: insert(
                t({
                    en: "{{name}} deleted",
                    es: "{{name}} eliminada",
                    fr: "{{name}} supprimée",
                    pt: "{{name}} excluída",
                })
            ),
            moved: insert(
                t({
                    en: "{{count}} entries moved to {{category}}",
                    es: "{{count}} movimientos pasaron a {{category}}",
                    fr: "{{count}} opérations déplacées vers {{category}}",
                    pt: "{{count}} lançamentos foram para {{category}}",
                })
            ),
            movedOne: insert(
                t({
                    en: "1 entry moved to {{category}}",
                    es: "1 movimiento pasó a {{category}}",
                    fr: "1 opération déplacée vers {{category}}",
                    pt: "1 lançamento foi para {{category}}",
                })
            ),
            off: insert(
                t({
                    en: "{{name}} is off. Its {{count}} entries keep their categories.",
                    es: "{{name}} está desactivada. Sus {{count}} movimientos conservan sus categorías.",
                    fr: "{{name}} est désactivée. Ses {{count}} opérations gardent leur catégorie.",
                    pt: "{{name}} está desativada. Seus {{count}} lançamentos mantêm as categorias.",
                })
            ),
            saveFailed: t({
                en: "Could not save. Try again.",
                es: "No se pudo guardar. Intenta de nuevo.",
                fr: "Échec de l'enregistrement. Réessayez.",
                pt: "Não foi possível salvar. Tente de novo.",
            }),
            undo: t({ en: "Undo", es: "Deshacer", fr: "Annuler", pt: "Desfazer" }),
        },
    },
    key: "dashboard-rules",
} satisfies Dictionary;

export default dashboardRules;
