import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardLedger = {
    content: {
        bulk: {
            addTag: t({
                en: "Add tag",
                de: "Tag hinzufügen",
                es: "Añadir etiqueta",
                fr: "Ajouter un tag",
                pt: "Adicionar tag",
            }),
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            createTag: insert(
                t({
                    en: "Create #{{name}}",
                    de: "#{{name}} anlegen",
                    es: "Crear #{{name}}",
                    fr: "Créer #{{name}}",
                    pt: "Criar #{{name}}",
                })
            ),
            delete: t({ en: "Delete", de: "Löschen", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            deleteBody: t({
                en: "You can undo right after.",
                de: "Du kannst es direkt danach rückgängig machen.",
                es: "Puedes deshacerlo justo después.",
                fr: "Tu peux annuler juste après.",
                pt: "Você pode desfazer logo depois.",
            }),
            deleteTitle: insert(
                t({
                    en: "Delete {{count}} entries?",
                    de: "{{count}} Einträge löschen?",
                    es: "¿Eliminar {{count}} movimientos?",
                    fr: "Supprimer {{count}} opérations ?",
                    pt: "Excluir {{count}} lançamentos?",
                })
            ),
            searchTags: t({
                en: "Search or create a tag",
                de: "Tag suchen oder anlegen",
                es: "Busca o crea una etiqueta",
                fr: "Chercher ou créer un tag",
                pt: "Buscar ou criar uma tag",
            }),
            setAccount: t({
                en: "Set account",
                de: "Konto setzen",
                es: "Cambiar cuenta",
                fr: "Changer de compte",
                pt: "Mudar conta",
            }),
            setCategory: t({
                en: "Set category",
                de: "Kategorie setzen",
                es: "Cambiar categoría",
                fr: "Changer de catégorie",
                pt: "Mudar categoria",
            }),
            tagged: insert(
                t({
                    en: "Tagged {{count}} with #{{name}}",
                    de: "{{count}} mit #{{name}} getaggt",
                    es: "{{count}} con #{{name}}",
                    fr: "{{count}} tagués #{{name}}",
                    pt: "{{count}} com #{{name}}",
                })
            ),
        },
        columns: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            comfortable: t({ en: "Comfortable", de: "Bequem", es: "Cómoda", fr: "Confortable", pt: "Confortável" }),
            compact: t({ en: "Compact", de: "Kompakt", es: "Compacta", fr: "Compacte", pt: "Compacta" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            density: t({ en: "Density", de: "Dichte", es: "Densidad", fr: "Densité", pt: "Densidade" }),
            fee: t({ en: "Fee", de: "Gebühr", es: "Comisión", fr: "Frais", pt: "Tarifa" }),
            from: t({ en: "From", de: "Von", es: "Desde", fr: "De", pt: "De" }),
            label: t({ en: "Columns", de: "Spalten", es: "Columnas", fr: "Colonnes", pt: "Colunas" }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Commerçant", pt: "Estabelecimento" }),
            note: t({ en: "Note", de: "Notiz", es: "Nota", fr: "Note", pt: "Nota" }),
            notes: t({ en: "Notes", de: "Notizen", es: "Notas", fr: "Notes", pt: "Notas" }),
            paidVia: t({
                en: "How you paid",
                de: "Bezahlt mit",
                es: "Cómo pagaste",
                fr: "Moyen de paiement",
                pt: "Como pagou",
            }),
            reset: t({ en: "Reset", de: "Zurücksetzen", es: "Restablecer", fr: "Réinitialiser", pt: "Redefinir" }),
            select: t({ en: "Select", de: "Auswahl", es: "Selección", fr: "Sélection", pt: "Seleção" }),
            tags: t({ en: "Tags", de: "Tags", es: "Etiquetas", fr: "Tags", pt: "Tags" }),
            to: t({ en: "To", de: "Nach", es: "Hacia", fr: "Vers", pt: "Para" }),
        },
        empty: {
            clearAll: t({
                en: "Clear filters",
                de: "Filter zurücksetzen",
                es: "Quitar filtros",
                fr: "Effacer les filtres",
                pt: "Limpar filtros",
            }),
            noResults: t({
                en: "No entries match",
                de: "Keine passenden Einträge",
                es: "Ningún movimiento coincide",
                fr: "Aucune opération ne correspond",
                pt: "Nenhum lançamento corresponde",
            }),
            noResultsLine: t({
                en: "Try a wider date range or clear a filter.",
                de: "Wähle einen längeren Zeitraum oder entferne einen Filter.",
                es: "Prueba un rango de fechas más amplio o quita un filtro.",
                fr: "Essaie une période plus large ou retire un filtre.",
                pt: "Tente um período maior ou remova um filtro.",
            }),
            reviewTitle: t({
                en: "All clear",
                de: "Alles erledigt",
                es: "Todo al día",
                fr: "Tout est à jour",
                pt: "Tudo em dia",
            }),
            reviewLine: t({
                en: "Nothing is waiting for a review.",
                de: "Nichts wartet auf eine Prüfung.",
                es: "No hay nada esperando revisión.",
                fr: "Rien n’attend de vérification.",
                pt: "Nada está esperando revisão.",
            }),
        },
        exporting: {
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            csv: t({ en: "CSV", de: "CSV", es: "CSV", fr: "CSV", pt: "CSV" }),
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            format: t({ en: "Format", de: "Format", es: "Formato", fr: "Format", pt: "Formato" }),
            include: t({ en: "Include", de: "Enthalten", es: "Incluir", fr: "Inclure", pt: "Incluir" }),
            net: t({ en: "Net", de: "Saldo", es: "Neto", fr: "Net", pt: "Líquido" }),
            submitMany: insert(
                t({
                    en: "Export {{count}} entries",
                    de: "{{count}} Einträge exportieren",
                    es: "Exportar {{count}} movimientos",
                    fr: "Exporter {{count}} opérations",
                    pt: "Exportar {{count}} lançamentos",
                })
            ),
            submitOne: t({
                en: "Export 1 entry",
                de: "1 Eintrag exportieren",
                es: "Exportar 1 movimiento",
                fr: "Exporter 1 opération",
                pt: "Exportar 1 lançamento",
            }),
            tagsAndNotes: t({
                en: "Tags and notes",
                de: "Tags und Notizen",
                es: "Etiquetas y notas",
                fr: "Tags et notes",
                pt: "Tags e notas",
            }),
            title: t({ en: "Export", de: "Exportieren", es: "Exportar", fr: "Exporter", pt: "Exportar" }),
            view: t({ en: "View", de: "Ansicht", es: "Vista", fr: "Vue", pt: "Visualização" }),
        },
        filters: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            allTime: t({
                en: "All time",
                de: "Gesamter Zeitraum",
                es: "Todo",
                fr: "Depuis le début",
                pt: "Todo o período",
            }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            amountBetween: insert(
                t({
                    en: "{{min}} to {{max}}",
                    de: "{{min}} bis {{max}}",
                    es: "{{min}} a {{max}}",
                    fr: "{{min}} à {{max}}",
                    pt: "{{min}} a {{max}}",
                })
            ),
            amountOver: insert(
                t({
                    en: "Over {{amount}}",
                    de: "Über {{amount}}",
                    es: "Más de {{amount}}",
                    fr: "Plus de {{amount}}",
                    pt: "Acima de {{amount}}",
                })
            ),
            amountUnder: insert(
                t({
                    en: "Under {{amount}}",
                    de: "Unter {{amount}}",
                    es: "Menos de {{amount}}",
                    fr: "Moins de {{amount}}",
                    pt: "Abaixo de {{amount}}",
                })
            ),
            apply: t({ en: "Apply", de: "Anwenden", es: "Aplicar", fr: "Appliquer", pt: "Aplicar" }),
            between: t({ en: "Between", de: "Zwischen", es: "Entre", fr: "Entre", pt: "Entre" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            clearAll: t({
                en: "Clear all",
                de: "Alle entfernen",
                es: "Quitar todo",
                fr: "Tout effacer",
                pt: "Limpar tudo",
            }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            max: t({ en: "Max", de: "Max.", es: "Máx.", fr: "Max.", pt: "Máx." }),
            maxBelowMin: t({
                en: "Max must be above min",
                de: "Max. muss über Min. liegen",
                es: "El máximo debe ser mayor que el mínimo",
                fr: "Le max. doit dépasser le min.",
                pt: "O máximo precisa ser maior que o mínimo",
            }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Commerçant", pt: "Estabelecimento" }),
            min: t({ en: "Min", de: "Min.", es: "Mín.", fr: "Min.", pt: "Mín." }),
            noTag: t({ en: "No tag", de: "Ohne Tag", es: "Sin etiqueta", fr: "Sans tag", pt: "Sem tag" }),
            over: t({ en: "Over", de: "Über", es: "Más de", fr: "Plus de", pt: "Acima de" }),
            search: t({
                en: "Merchant, note, tag",
                de: "Händler, Notiz, Tag",
                es: "Comercio, nota, etiqueta",
                fr: "Commerçant, note, tag",
                pt: "Estabelecimento, nota, tag",
            }),
            searchMerchants: t({
                en: "Search merchants",
                de: "Händler suchen",
                es: "Buscar comercios",
                fr: "Chercher un commerçant",
                pt: "Buscar estabelecimentos",
            }),
            searchTags: t({
                en: "Search tags",
                de: "Tags suchen",
                es: "Buscar etiquetas",
                fr: "Chercher un tag",
                pt: "Buscar tags",
            }),
            searchTransfers: t({
                en: "Account, note",
                de: "Konto, Notiz",
                es: "Cuenta, nota",
                fr: "Compte, note",
                pt: "Conta, nota",
            }),
            tag: t({ en: "Tag", de: "Tag", es: "Etiqueta", fr: "Tag", pt: "Tag" }),
            under: t({ en: "Under", de: "Unter", es: "Menos de", fr: "Moins de", pt: "Abaixo de" }),
        },
        footer: {
            average: t({ en: "Average", de: "Durchschnitt", es: "Promedio", fr: "Moyenne", pt: "Média" }),
            fees: t({ en: "Fees", de: "Gebühren", es: "Comisiones", fr: "Frais", pt: "Tarifas" }),
            in: t({ en: "In", de: "Rein", es: "Entró", fr: "Entrées", pt: "Entrou" }),
            moved: t({ en: "Moved", de: "Bewegt", es: "Movido", fr: "Déplacé", pt: "Movido" }),
            net: t({ en: "Net", de: "Netto", es: "Neto", fr: "Solde", pt: "Saldo" }),
            next: t({
                en: "Next page",
                de: "Nächste Seite",
                es: "Página siguiente",
                fr: "Page suivante",
                pt: "Próxima página",
            }),
            out: t({ en: "Out", de: "Raus", es: "Salió", fr: "Sorties", pt: "Saiu" }),
            perDay: insert(
                t({
                    en: "{{amount}} a day",
                    de: "{{amount}} pro Tag",
                    es: "{{amount}} al día",
                    fr: "{{amount}} par jour",
                    pt: "{{amount}} por dia",
                })
            ),
            previous: t({
                en: "Previous page",
                de: "Vorige Seite",
                es: "Página anterior",
                fr: "Page précédente",
                pt: "Página anterior",
            }),
            range: insert(
                t({
                    en: "{{first}}-{{last}} of {{total}}",
                    de: "{{first}}-{{last}} von {{total}}",
                    es: "{{first}}-{{last}} de {{total}}",
                    fr: "{{first}}-{{last}} sur {{total}}",
                    pt: "{{first}}-{{last}} de {{total}}",
                })
            ),
            spent: t({ en: "Spent", de: "Ausgegeben", es: "Gastado", fr: "Dépensé", pt: "Gasto" }),
            total: t({ en: "Total", de: "Summe", es: "Total", fr: "Total", pt: "Total" }),
        },
        inline: {
            amountSaved: t({
                en: "Amount updated",
                de: "Betrag geändert",
                es: "Monto actualizado",
                fr: "Montant modifié",
                pt: "Valor atualizado",
            }),
            editAmount: insert(
                t({
                    en: "Amount of {{name}}",
                    de: "Betrag von {{name}}",
                    es: "Monto de {{name}}",
                    fr: "Montant de {{name}}",
                    pt: "Valor de {{name}}",
                })
            ),
            editTags: insert(
                t({
                    en: "Tags of {{name}}",
                    de: "Tags von {{name}}",
                    es: "Etiquetas de {{name}}",
                    fr: "Tags de {{name}}",
                    pt: "Tags de {{name}}",
                })
            ),
            tagTooLong: insert(
                t({
                    en: "Keep each tag to {{limit}} characters",
                    de: "Höchstens {{limit}} Zeichen pro Tag",
                    es: "Máximo {{limit}} caracteres por etiqueta",
                    fr: "{{limit}} caractères au plus par tag",
                    pt: "No máximo {{limit}} caracteres por tag",
                })
            ),
            tagsPlaceholder: t({ en: "#tag", de: "#tag", es: "#etiqueta", fr: "#tag", pt: "#tag" }),
            tagsSaved: t({
                en: "Tags updated",
                de: "Tags geändert",
                es: "Etiquetas actualizadas",
                fr: "Tags modifiés",
                pt: "Tags atualizadas",
            }),
        },
        kpi: {
            fees: t({ en: "Fees", de: "Gebühren", es: "Comisiones", fr: "Frais", pt: "Tarifas" }),
            moved: t({ en: "Moved", de: "Bewegt", es: "Movido", fr: "Déplacé", pt: "Movido" }),
            netInto: insert(
                t({
                    en: "Net into {{account}}",
                    de: "Netto auf {{account}}",
                    es: "Neto hacia {{account}}",
                    fr: "Net vers {{account}}",
                    pt: "Líquido para {{account}}",
                })
            ),
            route: t({
                en: "Top route",
                de: "Häufigster Weg",
                es: "Ruta principal",
                fr: "Trajet principal",
                pt: "Rota principal",
            }),
            times: insert(
                t({
                    en: "{{count}} times",
                    de: "{{count}} Mal",
                    es: "{{count}} veces",
                    fr: "{{count}} fois",
                    pt: "{{count}} vezes",
                })
            ),
        },
        page: {
            export: t({ en: "Export", de: "Exportieren", es: "Exportar", fr: "Exporter", pt: "Exportar" }),
            import: t({ en: "Import", de: "Importieren", es: "Importar", fr: "Importer", pt: "Importar" }),
            newTransfer: t({
                en: "New transfer",
                de: "Neue Umbuchung",
                es: "Nueva transferencia",
                fr: "Nouveau virement",
                pt: "Nova transferência",
            }),
            title: t({ en: "Transactions", de: "Einträge", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
        },
        drawer: {
            openPlan: t({
                en: "Open plan",
                de: "Plan öffnen",
                es: "Abrir plan",
                fr: "Ouvrir le plan",
                pt: "Abrir plano",
            }),
            openRecurring: t({
                en: "Open in Recurring",
                de: "In Wiederkehrend öffnen",
                es: "Abrir en Recurrentes",
                fr: "Ouvrir dans Récurrentes",
                pt: "Abrir em Recorrentes",
            }),
        },
        pickCategory: t({
            en: "Pick category",
            de: "Kategorie wählen",
            es: "Elegir categoría",
            fr: "Choisir une catégorie",
            pt: "Escolher categoria",
        }),
        review: {
            dot: t({ en: "To review", de: "Zu prüfen", es: "Por revisar", fr: "À vérifier", pt: "A revisar" }),
            mark: t({
                en: "Mark reviewed",
                de: "Als geprüft markieren",
                es: "Marcar revisado",
                fr: "Marquer vérifié",
                pt: "Marcar revisado",
            }),
            markAll: t({
                en: "Mark all reviewed",
                de: "Alle als geprüft markieren",
                es: "Marcar todo revisado",
                fr: "Tout marquer vérifié",
                pt: "Marcar tudo revisado",
            }),
            marked: insert(
                t({
                    en: "Marked {{count}} reviewed",
                    de: "{{count}} als geprüft markiert",
                    es: "{{count}} marcados como revisados",
                    fr: "{{count}} marqués vérifiés",
                    pt: "{{count}} marcados como revisados",
                })
            ),
        },
        row: {
            delete: t({ en: "Delete", de: "Löschen", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            duplicate: t({ en: "Duplicate", de: "Duplizieren", es: "Duplicar", fr: "Dupliquer", pt: "Duplicar" }),
            duplicated: t({
                en: "Entry duplicated",
                de: "Eintrag dupliziert",
                es: "Movimiento duplicado",
                fr: "Opération dupliquée",
                pt: "Lançamento duplicado",
            }),
            menu: insert(
                t({
                    en: "Actions for {{name}}",
                    de: "Aktionen für {{name}}",
                    es: "Acciones para {{name}}",
                    fr: "Actions pour {{name}}",
                    pt: "Ações para {{name}}",
                })
            ),
            open: t({ en: "Open", de: "Öffnen", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
        },
        sort: {
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            largest: t({
                en: "Largest amount",
                de: "Höchster Betrag",
                es: "Monto más alto",
                fr: "Montant le plus élevé",
                pt: "Maior valor",
            }),
            merchant: t({
                en: "Merchant A to Z",
                de: "Händler A bis Z",
                es: "Comercio de la A a la Z",
                fr: "Commerçant de A à Z",
                pt: "Estabelecimento de A a Z",
            }),
            newest: t({ en: "Newest", de: "Neueste", es: "Más recientes", fr: "Plus récentes", pt: "Mais recentes" }),
            oldest: t({ en: "Oldest", de: "Älteste", es: "Más antiguos", fr: "Plus anciennes", pt: "Mais antigos" }),
            smallest: t({
                en: "Smallest amount",
                de: "Niedrigster Betrag",
                es: "Monto más bajo",
                fr: "Montant le plus bas",
                pt: "Menor valor",
            }),
        },
        tabs: {
            all: t({ en: "All", de: "Alle", es: "Todos", fr: "Tout", pt: "Todos" }),
            expenses: t({ en: "Expenses", de: "Ausgaben", es: "Gastos", fr: "Dépenses", pt: "Despesas" }),
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos", fr: "Revenus", pt: "Receitas" }),
            review: t({ en: "To review", de: "Zu prüfen", es: "Por revisar", fr: "À vérifier", pt: "A revisar" }),
            transfers: t({
                en: "Transfers",
                de: "Umbuchungen",
                es: "Transferencias",
                fr: "Virements",
                pt: "Transferências",
            }),
            uncategorized: t({
                en: "Uncategorized",
                de: "Ohne Kategorie",
                es: "Sin categoría",
                fr: "Sans catégorie",
                pt: "Sem categoria",
            }),
        },
        transferName: insert(
            t({
                en: "{{from}} to {{to}}",
                de: "{{from}} nach {{to}}",
                es: "{{from}} a {{to}}",
                fr: "{{from}} vers {{to}}",
                pt: "{{from}} para {{to}}",
            })
        ),
        views: {
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            copyName: insert(
                t({
                    en: "{{name}} copy",
                    de: "{{name}} Kopie",
                    es: "Copia de {{name}}",
                    fr: "Copie de {{name}}",
                    pt: "Cópia de {{name}}",
                })
            ),
            delete: t({
                en: "Delete view",
                de: "Ansicht löschen",
                es: "Eliminar vista",
                fr: "Supprimer la vue",
                pt: "Excluir visualização",
            }),
            deleteBody: insert(
                t({
                    en: "Your {{count}} entries stay. Only the view goes.",
                    de: "Deine {{count}} Einträge bleiben. Nur die Ansicht verschwindet.",
                    es: "Tus {{count}} movimientos se quedan. Solo se va la vista.",
                    fr: "Tes {{count}} opérations restent. Seule la vue disparaît.",
                    pt: "Seus {{count}} lançamentos ficam. Só a visualização sai.",
                })
            ),
            deleteTitle: insert(
                t({
                    en: "Delete {{name}}?",
                    de: "{{name}} löschen?",
                    es: "¿Eliminar {{name}}?",
                    fr: "Supprimer {{name}} ?",
                    pt: "Excluir {{name}}?",
                })
            ),
            duplicate: t({ en: "Duplicate", de: "Duplizieren", es: "Duplicar", fr: "Dupliquer", pt: "Duplicar" }),
            filters: t({ en: "Filters", de: "Filter", es: "Filtros", fr: "Filtres", pt: "Filtros" }),
            keepSort: t({
                en: "Keep sort and columns",
                de: "Sortierung und Spalten behalten",
                es: "Guardar orden y columnas",
                fr: "Garder le tri et les colonnes",
                pt: "Manter ordem e colunas",
            }),
            menu: insert(
                t({
                    en: "Options for {{name}}",
                    de: "Optionen für {{name}}",
                    es: "Opciones de {{name}}",
                    fr: "Options de {{name}}",
                    pt: "Opções de {{name}}",
                })
            ),
            moveLeft: t({
                en: "Move left",
                de: "Nach links",
                es: "Mover a la izquierda",
                fr: "Déplacer à gauche",
                pt: "Mover para a esquerda",
            }),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            nameRequired: t({
                en: "Give the view a name",
                de: "Gib der Ansicht einen Namen",
                es: "Ponle un nombre a la vista",
                fr: "Donne un nom à la vue",
                pt: "Dê um nome à visualização",
            }),
            noFilters: t({
                en: "No filters, so the view shows every entry.",
                de: "Keine Filter, die Ansicht zeigt also alle Einträge.",
                es: "Sin filtros, así que la vista muestra todos los movimientos.",
                fr: "Aucun filtre, la vue montre donc toutes les opérations.",
                pt: "Sem filtros, então a visualização mostra todos os lançamentos.",
            }),
            rename: t({ en: "Rename", de: "Umbenennen", es: "Renombrar", fr: "Renommer", pt: "Renomear" }),
            renameTitle: t({
                en: "Rename view",
                de: "Ansicht umbenennen",
                es: "Renombrar vista",
                fr: "Renommer la vue",
                pt: "Renomear visualização",
            }),
            save: t({
                en: "Save view",
                de: "Ansicht speichern",
                es: "Guardar vista",
                fr: "Enregistrer la vue",
                pt: "Salvar visualização",
            }),
            saveName: t({ en: "Save", de: "Speichern", es: "Guardar", fr: "Enregistrer", pt: "Salvar" }),
            taken: t({
                en: "That name is taken",
                de: "Der Name ist schon vergeben",
                es: "Ese nombre ya existe",
                fr: "Ce nom est déjà pris",
                pt: "Esse nome já existe",
            }),
        },
    },
    key: "dashboard-ledger",
} satisfies Dictionary;

export default dashboardLedger;
