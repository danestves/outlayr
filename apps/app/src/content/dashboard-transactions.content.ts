import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardTransactions = {
    content: {
        amount: {
            chip: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            max: t({ en: "At most", de: "Höchstens", es: "Como máximo", fr: "Au plus", pt: "No máximo" }),
            min: t({ en: "At least", de: "Mindestens", es: "Como mínimo", fr: "Au moins", pt: "No mínimo" }),
        },
        bulk: {
            clear: t({
                en: "Clear selection",
                de: "Auswahl aufheben",
                es: "Quitar selección",
                fr: "Effacer la sélection",
                pt: "Limpar seleção",
            }),
            delete: t({ en: "Delete", de: "Löschen", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            selectAll: t({
                en: "Select all",
                de: "Alle auswählen",
                es: "Seleccionar todo",
                fr: "Tout sélectionner",
                pt: "Selecionar tudo",
            }),
            selected: insert(
                t({
                    en: "{{count}} selected",
                    de: "{{count}} ausgewählt",
                    es: "{{count}} seleccionados",
                    fr: "{{count}} sélectionnées",
                    pt: "{{count}} selecionados",
                })
            ),
            selectEntry: insert(
                t({
                    en: "Select {{name}}",
                    de: "{{name}} auswählen",
                    es: "Seleccionar {{name}}",
                    fr: "Sélectionner {{name}}",
                    pt: "Selecionar {{name}}",
                })
            ),
            updated: insert(
                t({
                    en: "{{count}} updated",
                    de: "{{count}} aktualisiert",
                    es: "{{count}} actualizados",
                    fr: "{{count}} modifiées",
                    pt: "{{count}} atualizados",
                })
            ),
            updatedSkipped: insert(
                t({
                    en: "{{count}} updated, {{skipped}} unchanged",
                    de: "{{count}} aktualisiert, {{skipped}} unverändert",
                    es: "{{count}} actualizados, {{skipped}} sin cambios",
                    fr: "{{count}} modifiées, {{skipped}} inchangées",
                    pt: "{{count}} atualizados, {{skipped}} sem alteração",
                })
            ),
        },
        clearFilters: t({
            en: "Clear filters",
            de: "Filter zurücksetzen",
            es: "Quitar filtros",
            fr: "Effacer les filtres",
            pt: "Limpar filtros",
        }),
        csv: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            currency: t({ en: "Currency", de: "Währung", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            inMain: insert(
                t({
                    en: "Amount in {{currency}}",
                    de: "Betrag in {{currency}}",
                    es: "Monto en {{currency}}",
                    fr: "Montant en {{currency}}",
                    pt: "Valor em {{currency}}",
                })
            ),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Commerçant", pt: "Estabelecimento" }),
            notes: t({ en: "Notes", de: "Notizen", es: "Notas", fr: "Notes", pt: "Notas" }),
            tags: t({ en: "Tags", de: "Tags", es: "Etiquetas", fr: "Tags", pt: "Tags" }),
            type: t({ en: "Type", de: "Typ", es: "Tipo", fr: "Type", pt: "Tipo" }),
        },
        deleted: {
            failed: t({
                en: "Could not delete. Try again.",
                de: "Löschen hat nicht geklappt. Versuch es noch mal.",
                es: "No se pudo eliminar. Inténtalo de nuevo.",
                fr: "Suppression impossible. Réessayez.",
                pt: "Não foi possível excluir. Tente de novo.",
            }),
            many: insert(
                t({
                    en: "{{count}} entries deleted",
                    de: "{{count}} Einträge gelöscht",
                    es: "{{count}} movimientos eliminados",
                    fr: "{{count}} opérations supprimées",
                    pt: "{{count}} lançamentos excluídos",
                })
            ),
            one: t({
                en: "Entry deleted",
                de: "Eintrag gelöscht",
                es: "Movimiento eliminado",
                fr: "Opération supprimée",
                pt: "Lançamento excluído",
            }),
        },
        detail: {
            charged: t({ en: "Charged", de: "Belastet", es: "Cobrado", fr: "Débité", pt: "Cobrado" }),
            copied: t({
                en: "Link copied",
                de: "Link kopiert",
                es: "Enlace copiado",
                fr: "Lien copié",
                pt: "Link copiado",
            }),
            copyLink: t({
                en: "Copy link",
                de: "Link kopieren",
                es: "Copiar enlace",
                fr: "Copier le lien",
                pt: "Copiar link",
            }),
            done: t({ en: "Done", de: "Fertig", es: "Listo", fr: "Terminé", pt: "Concluído" }),
            edit: t({ en: "Edit", de: "Bearbeiten", es: "Editar", fr: "Modifier", pt: "Editar" }),
            feeOf: insert(
                t({
                    en: "{{amount}} + {{fee}} card fee",
                    de: "{{amount}} + {{fee}} Kartengebühr",
                    es: "{{amount}} + {{fee}} de comisión",
                    fr: "{{amount}} + {{fee}} de frais",
                    pt: "{{amount}} + {{fee}} de tarifa",
                })
            ),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            addFee: t({
                en: "Add a fee",
                de: "Gebühr hinzufügen",
                es: "Añadir comisión",
                fr: "Ajouter des frais",
                pt: "Adicionar taxa",
            }),
            editOnPhone: t({
                en: "Edit this on your phone.",
                de: "Bearbeite das auf deinem Handy.",
                es: "Edítalo en tu teléfono.",
                fr: "Modifiez-la sur votre téléphone.",
                pt: "Edite no seu celular.",
            }),
            fee: t({ en: "Fee", de: "Gebühr", es: "Comisión", fr: "Frais", pt: "Tarifa" }),
            from: t({ en: "From", de: "Von", es: "Desde", fr: "De", pt: "De" }),
            fromAccount: insert(
                t({
                    en: "from {{account}}",
                    de: "von {{account}}",
                    es: "desde {{account}}",
                    fr: "depuis {{account}}",
                    pt: "de {{account}}",
                })
            ),
            hints: {
                category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
                close: t({ en: "Close", de: "Schließen", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
                delete: t({ en: "Delete", de: "Löschen", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
                move: t({ en: "Move", de: "Verschieben", es: "Mover", fr: "Parcourir", pt: "Navegar" }),
            },
            installments: t({ en: "Installments", de: "Ratenpläne", es: "Cuotas", fr: "Échéances", pt: "Parcelas" }),
            more: t({ en: "More", de: "Mehr", es: "Más", fr: "Plus", pt: "Mais" }),
            moves: t({ en: "Moves", de: "Umbuchungen", es: "Movimientos", fr: "Mouvements", pt: "Movimentos" }),
            next: t({
                en: "Next entry",
                de: "Nächster Eintrag",
                es: "Movimiento siguiente",
                fr: "Opération suivante",
                pt: "Próximo lançamento",
            }),
            note: t({ en: "Note", de: "Notiz", es: "Nota", fr: "Note", pt: "Nota" }),
            off: t({ en: "Off", de: "Aus", es: "No", fr: "Non", pt: "Não" }),
            perUnit: insert(
                t({
                    en: "{{rate}} per {{currency}}",
                    de: "{{rate}} pro {{currency}}",
                    es: "{{rate}} por {{currency}}",
                    fr: "{{rate}} pour {{currency}}",
                    pt: "{{rate}} por {{currency}}",
                })
            ),
            previous: t({
                en: "Previous entry",
                de: "Voriger Eintrag",
                es: "Movimiento anterior",
                fr: "Opération précédente",
                pt: "Lançamento anterior",
            }),
            rate: t({ en: "Rate", de: "Kurs", es: "Tasa", fr: "Taux", pt: "Taxa de câmbio" }),
            swap: t({ en: "Swap", de: "Tauschen", es: "Intercambiar", fr: "Inverser", pt: "Inverter" }),
            to: t({ en: "To", de: "Nach", es: "Hacia", fr: "Vers", pt: "Para" }),
        },
        empty: {
            line: t({
                en: "Add your first one here or on your phone.",
                de: "Füge deinen ersten hier oder auf deinem Handy hinzu.",
                es: "Añade el primero aquí o en tu teléfono.",
                fr: "Ajoutez la première ici ou sur votre téléphone.",
                pt: "Adicione o primeiro aqui ou no celular.",
            }),
            title: t({
                en: "No entries yet",
                de: "Noch keine Einträge",
                es: "Aún no hay movimientos",
                fr: "Aucune opération pour l'instant",
                pt: "Nenhum lançamento ainda",
            }),
        },
        installmentOf: insert(
            t({
                en: "{{at}} of {{of}}",
                de: "{{at}} von {{of}}",
                es: "{{at}} de {{of}}",
                fr: "{{at}} sur {{of}}",
                pt: "{{at}} de {{of}}",
            })
        ),
        export: t({ en: "Export", de: "Exportieren", es: "Exportar", fr: "Exporter", pt: "Exportar" }),
        exportFile: t({
            en: "outlayr-transactions",
            de: "outlayr-eintraege",
            es: "outlayr-movimientos",
            fr: "outlayr-operations",
            pt: "outlayr-lancamentos",
        }),
        footer: {
            in: t({ en: "In", de: "Rein", es: "Entró", fr: "Entrées", pt: "Entrou" }),
            net: t({ en: "Net", de: "Netto", es: "Neto", fr: "Solde", pt: "Saldo" }),
            out: t({ en: "Out", de: "Raus", es: "Salió", fr: "Sorties", pt: "Saiu" }),
        },
        form: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            addAnother: t({
                en: "Add another",
                de: "Weiteren hinzufügen",
                es: "Añadir otro",
                fr: "En ajouter une autre",
                pt: "Adicionar outro",
            }),
            added: t({
                en: "Entry added",
                de: "Eintrag hinzugefügt",
                es: "Movimiento añadido",
                fr: "Opération ajoutée",
                pt: "Lançamento adicionado",
            }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            amountRequired: t({
                en: "Type an amount first",
                de: "Gib zuerst einen Betrag ein",
                es: "Primero escribe un monto",
                fr: "Saisissez d'abord un montant",
                pt: "Primeiro digite um valor",
            }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            categoryRequired: t({
                en: "Pick a category first",
                de: "Wähle zuerst eine Kategorie",
                es: "Primero elige una categoría",
                fr: "Choisissez d'abord une catégorie",
                pt: "Primeiro escolha uma categoria",
            }),
            createAccount: t({
                en: "Create account",
                de: "Konto erstellen",
                es: "Crear cuenta",
                fr: "Créer un compte",
                pt: "Criar conta",
            }),
            currency: t({ en: "Currency", de: "Währung", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            dateRequired: t({
                en: "Pick a date first",
                de: "Wähle zuerst ein Datum",
                es: "Primero elige una fecha",
                fr: "Choisissez d'abord une date",
                pt: "Primeiro escolha uma data",
            }),
            fee: t({
                en: "Card fee",
                de: "Kartengebühr",
                es: "Comisión",
                fr: "Frais de carte",
                pt: "Tarifa do cartão",
            }),
            feeNote: insert(
                t({
                    en: "Fee · {{merchant}}",
                    de: "Gebühr · {{merchant}}",
                    es: "Comisión · {{merchant}}",
                    fr: "Frais · {{merchant}}",
                    pt: "Tarifa · {{merchant}}",
                })
            ),
            feePlaceholder: t({
                en: "3.72 or 3%",
                de: "3,72 oder 3 %",
                es: "3,72 o 3%",
                fr: "3,72 ou 3 %",
                pt: "3,72 ou 3%",
            }),
            logAgain: t({
                en: "Log again",
                de: "Erneut erfassen",
                es: "Registrar de nuevo",
                fr: "Saisir à nouveau",
                pt: "Registrar de novo",
            }),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            noAccountLine: t({
                en: "Create an account to keep this entry's balance somewhere.",
                de: "Erstelle ein Konto, um den Kontostand dieses Eintrags irgendwo zu führen.",
                es: "Crea una cuenta para llevar el saldo de este movimiento.",
                fr: "Créez un compte pour suivre le solde de cette opération.",
                pt: "Crie uma conta para acompanhar o saldo deste lançamento.",
            }),
            none: t({ en: "None", de: "Keine", es: "Ninguna", fr: "Aucun", pt: "Nenhuma" }),
            note: t({ en: "Note", de: "Notiz", es: "Nota", fr: "Note", pt: "Nota" }),
            noteAdd: t({
                en: "Add a note",
                de: "Notiz hinzufügen",
                es: "Añadir una nota",
                fr: "Ajouter une note",
                pt: "Adicionar nota",
            }),
            pickDate: t({
                en: "Pick a date",
                de: "Datum wählen",
                es: "Elegir fecha",
                fr: "Choisir une date",
                pt: "Escolher data",
            }),
            removeFee: t({
                en: "Remove fee",
                de: "Gebühr entfernen",
                es: "Quitar comisión",
                fr: "Retirer les frais",
                pt: "Remover tarifa",
            }),
            rate: t({ en: "Rate", de: "Kurs", es: "Tasa", fr: "Taux", pt: "Cotação" }),
            rateCustom: t({ en: "My rate", de: "Mein Kurs", es: "Mi tasa", fr: "Mon taux", pt: "Minha cotação" }),
            rateMissing: t({
                en: "No rate for this date. Use your own.",
                de: "Für dieses Datum gibt es keinen Kurs. Nimm deinen eigenen.",
                es: "No hay tasa para esta fecha. Usa la tuya.",
                fr: "Aucun taux à cette date. Utilisez le vôtre.",
                pt: "Sem cotação nesta data. Use a sua.",
            }),
            rateOfficial: t({ en: "Official", de: "Offiziell", es: "Oficial", fr: "Officiel", pt: "Oficial" }),
            ratePerUsd: t({ en: "Per USD", de: "Pro USD", es: "Por USD", fr: "Par USD", pt: "Por USD" }),
            rateRequired: t({
                en: "Type a rate first",
                de: "Gib zuerst einen Kurs ein",
                es: "Primero escribe una tasa",
                fr: "Saisissez d'abord un taux",
                pt: "Primeiro digite uma cotação",
            }),
            repeat: t({ en: "Repeat", de: "Wiederholen", es: "Repetir", fr: "Répéter", pt: "Repetir" }),
            repeatDaily: t({ en: "Daily", de: "Täglich", es: "Diario", fr: "Quotidien", pt: "Diário" }),
            repeatMonthly: t({ en: "Monthly", de: "Monatlich", es: "Mensual", fr: "Mensuel", pt: "Mensal" }),
            repeatNone: t({
                en: "Does not repeat",
                de: "Keine Wiederholung",
                es: "No se repite",
                fr: "Ne se répète pas",
                pt: "Não se repete",
            }),
            repeatWeekly: t({ en: "Weekly", de: "Wöchentlich", es: "Semanal", fr: "Hebdomadaire", pt: "Semanal" }),
            repeatYearly: t({ en: "Yearly", de: "Jährlich", es: "Anual", fr: "Annuel", pt: "Anual" }),
            saveFailed: t({
                en: "Could not save. Try again.",
                de: "Speichern hat nicht geklappt. Versuch es noch mal.",
                es: "No se pudo guardar. Inténtalo de nuevo.",
                fr: "Enregistrement impossible. Réessayez.",
                pt: "Não foi possível salvar. Tente de novo.",
            }),
            title: t({ en: "Entry", de: "Eintrag", es: "Movimiento", fr: "Opération", pt: "Lançamento" }),
            total: t({ en: "Total", de: "Gesamt", es: "Total", fr: "Total", pt: "Total" }),
        },
        kind: {
            expense: t({ en: "Expense", de: "Ausgabe", es: "Gasto", fr: "Dépense", pt: "Despesa" }),
            fee: t({ en: "Fee", de: "Gebühr", es: "Comisión", fr: "Frais", pt: "Tarifa" }),
            income: t({ en: "Income", de: "Einnahme", es: "Ingreso", fr: "Revenu", pt: "Receita" }),
            transfer: t({ en: "Transfer", de: "Umbuchung", es: "Transferencia", fr: "Virement", pt: "Transferência" }),
        },
        noMatch: {
            filters: t({
                en: "No entries match these filters",
                de: "Keine Einträge passen zu diesen Filtern",
                es: "Ningún movimiento coincide con estos filtros",
                fr: "Aucune opération ne correspond à ces filtres",
                pt: "Nenhum lançamento corresponde a estes filtros",
            }),
            query: insert(
                t({
                    en: "No entries for “{{query}}”",
                    de: "Keine Einträge für „{{query}}“",
                    es: "Ningún movimiento para «{{query}}»",
                    fr: "Aucune opération pour « {{query}} »",
                    pt: "Nenhum lançamento para “{{query}}”",
                })
            ),
            searchAll: t({
                en: "Search all time",
                de: "In der gesamten Zeit suchen",
                es: "Buscar en todo",
                fr: "Chercher sur toute la période",
                pt: "Buscar em todo o período",
            }),
        },
        recurring: t({ en: "Recurring", de: "Wiederkehrend", es: "Recurrente", fr: "Récurrente", pt: "Recorrente" }),
        search: t({
            en: "Search merchant, note, amount",
            de: "Händler, Notiz, Betrag suchen",
            es: "Buscar comercio, nota, monto",
            fr: "Chercher commerçant, note, montant",
            pt: "Buscar estabelecimento, nota, valor",
        }),
        span: {
            all: t({ en: "All", de: "Alle", es: "Todo", fr: "Tout", pt: "Tudo" }),
            from: t({ en: "From", de: "Von", es: "Desde", fr: "Du", pt: "De" }),
            range: t({ en: "Dates", de: "Daten", es: "Fechas", fr: "Dates", pt: "Datas" }),
            to: t({ en: "To", de: "Bis", es: "Hasta", fr: "Au", pt: "Até" }),
        },
        today: t({ en: "Today", de: "Heute", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
        transfers: t({
            en: "Transfers",
            de: "Umbuchungen",
            es: "Transferencias",
            fr: "Virements",
            pt: "Transferências",
        }),
        yesterday: t({ en: "Yesterday", de: "Gestern", es: "Ayer", fr: "Hier", pt: "Ontem" }),
    },
    key: "dashboard-transactions",
} satisfies Dictionary;

export default dashboardTransactions;
