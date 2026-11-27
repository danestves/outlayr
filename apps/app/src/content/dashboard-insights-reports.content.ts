import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInsightsReports = {
    content: {
        accounts: {
            all: t({
                en: "All accounts",
                de: "Alle Konten",
                es: "Todas las cuentas",
                fr: "Tous les comptes",
                pt: "Todas as contas",
            }),
            count: insert(
                t({
                    en: "{{count}} accounts",
                    de: "{{count}} Konten",
                    es: "{{count}} cuentas",
                    fr: "{{count}} comptes",
                    pt: "{{count}} contas",
                })
            ),
            label: t({ en: "Accounts", de: "Konten", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
        },
        bar: {
            export: t({ en: "Export", de: "Exportieren", es: "Exportar", fr: "Exporter", pt: "Exportar" }),
            newReport: t({
                en: "New report",
                de: "Neuer Bericht",
                es: "Nuevo reporte",
                fr: "Nouveau rapport",
                pt: "Novo relatório",
            }),
            saveReport: t({
                en: "Save report",
                de: "Bericht speichern",
                es: "Guardar reporte",
                fr: "Enregistrer le rapport",
                pt: "Salvar relatório",
            }),
            share: t({ en: "Share", de: "Teilen", es: "Compartir", fr: "Partager", pt: "Compartilhar" }),
            update: t({
                en: "Update report",
                de: "Bericht aktualisieren",
                es: "Actualizar reporte",
                fr: "Mettre à jour le rapport",
                pt: "Atualizar relatório",
            }),
        },
        by: insert(
            t({
                en: "{{columns}} by {{rows}}",
                de: "{{columns}} nach {{rows}}",
                es: "{{columns}} por {{rows}}",
                fr: "{{columns}} par {{rows}}",
                pt: "{{columns}} por {{rows}}",
            })
        ),
        rowsBy: insert(
            t({
                en: "{{rows}} by {{columns}}",
                de: "{{rows}} nach {{columns}}",
                es: "{{rows}} por {{columns}}",
                fr: "{{rows}} par {{columns}}",
                pt: "{{rows}} por {{columns}}",
            })
        ),
        chart: {
            label: insert(
                t({
                    en: "{{measure}} by {{rows}} and {{columns}}",
                    de: "{{measure}} nach {{rows}} und {{columns}}",
                    es: "{{measure}} por {{rows}} y {{columns}}",
                    fr: "{{measure}} par {{rows}} et {{columns}}",
                    pt: "{{measure}} por {{rows}} e {{columns}}",
                })
            ),
        },
        chips: {
            columns: t({ en: "Columns", de: "Spalten", es: "Columnas", fr: "Colonnes", pt: "Colunas" }),
            filter: t({ en: "Filter", de: "Filter", es: "Filtro", fr: "Filtrer", pt: "Filtrar" }),
            measure: t({ en: "Measure", de: "Kennzahl", es: "Medida", fr: "Mesure", pt: "Medida" }),
            removeTag: insert(
                t({
                    en: "Remove tag {{name}}",
                    de: "Tag {{name}} entfernen",
                    es: "Quitar la etiqueta {{name}}",
                    fr: "Retirer l'étiquette {{name}}",
                    pt: "Remover etiqueta {{name}}",
                })
            ),
            rows: t({ en: "Rows", de: "Zeilen", es: "Filas", fr: "Lignes", pt: "Linhas" }),
            tags: t({ en: "Tag", de: "Tag", es: "Etiqueta", fr: "Étiquette", pt: "Etiqueta" }),
            tagsNone: t({
                en: "No tags yet",
                de: "Noch keine Tags",
                es: "Aún no hay etiquetas",
                fr: "Pas encore d'étiquettes",
                pt: "Ainda sem etiquetas",
            }),
        },
        csv: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            description: t({
                en: "Description",
                de: "Beschreibung",
                es: "Descripción",
                fr: "Description",
                pt: "Descrição",
            }),
            income: t({ en: "Income", de: "Einnahmen", es: "Ingreso", fr: "Revenus", pt: "Receitas" }),
            spending: t({ en: "Spending", de: "Ausgaben", es: "Gasto", fr: "Dépenses", pt: "Despesas" }),
            type: t({ en: "Type", de: "Typ", es: "Tipo", fr: "Type", pt: "Tipo" }),
        },
        deleting: {
            body: t({
                en: "Your entries stay. Only the saved report goes away.",
                de: "Deine Einträge bleiben. Nur der gespeicherte Bericht verschwindet.",
                es: "Tus movimientos se quedan. Solo se va el reporte guardado.",
                fr: "Vos opérations restent. Seul le rapport enregistré disparaît.",
                pt: "Seus lançamentos ficam. Só o relatório salvo é removido.",
            }),
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            confirm: t({
                en: "Delete report",
                de: "Bericht löschen",
                es: "Eliminar reporte",
                fr: "Supprimer le rapport",
                pt: "Excluir relatório",
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
        dimensions: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            category: t({ en: "Category", de: "Kategorie", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            merchant: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Commerçant", pt: "Comerciante" }),
            subcategory: t({
                en: "Subcategory",
                de: "Unterkategorie",
                es: "Subcategoría",
                fr: "Sous-catégorie",
                pt: "Subcategoria",
            }),
            tag: t({ en: "Tag", de: "Tag", es: "Etiqueta", fr: "Étiquette", pt: "Etiqueta" }),
        },
        empty: {
            body: t({
                en: "Pick rows, columns and a range, then save it to come back to.",
                de: "Wähle Zeilen, Spalten und einen Zeitraum und speichere ihn, um später zurückzukommen.",
                es: "Elige filas, columnas y un rango, y guárdalo para volver a él.",
                fr: "Choisissez des lignes, des colonnes et une période, puis enregistrez pour y revenir.",
                pt: "Escolha linhas, colunas e um período, depois salve para voltar depois.",
            }),
            newReport: t({
                en: "New report",
                de: "Neuer Bericht",
                es: "Nuevo reporte",
                fr: "Nouveau rapport",
                pt: "Novo relatório",
            }),
            templates: {
                merchants: t({
                    en: "Top merchants",
                    de: "Top-Händler",
                    es: "Comercios principales",
                    fr: "Principaux commerçants",
                    pt: "Principais comerciantes",
                }),
                monthByCategory: t({
                    en: "Month by category",
                    de: "Monat nach Kategorie",
                    es: "Mes por categoría",
                    fr: "Mois par catégorie",
                    pt: "Mês por categoria",
                }),
                sixMonths: t({
                    en: "Last 6 months",
                    de: "Letzte 6 Monate",
                    es: "Últimos 6 meses",
                    fr: "6 derniers mois",
                    pt: "Últimos 6 meses",
                }),
                tagsByQuarter: t({
                    en: "Tags by quarter",
                    de: "Tags nach Quartal",
                    es: "Etiquetas por trimestre",
                    fr: "Étiquettes par trimestre",
                    pt: "Etiquetas por trimestre",
                }),
                thisYear: t({ en: "This year", de: "Dieses Jahr", es: "Este año", fr: "Cette année", pt: "Este ano" }),
            },
            title: t({
                en: "No reports yet",
                de: "Noch keine Berichte",
                es: "Aún no hay reportes",
                fr: "Aucun rapport pour l'instant",
                pt: "Nenhum relatório ainda",
            }),
        },
        exporting: {
            averages: t({
                en: "Average and comparison columns",
                de: "Spalten für Durchschnitt und Vergleich",
                es: "Columnas de promedio y comparación",
                fr: "Colonnes de moyenne et de comparaison",
                pt: "Colunas de média e comparação",
            }),
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            chart: t({ en: "Chart", de: "Diagramm", es: "Gráfico", fr: "Graphique", pt: "Gráfico" }),
            chartNote: t({ en: "PDF only", de: "Nur PDF", es: "Solo PDF", fr: "PDF uniquement", pt: "Somente PDF" }),
            csv: t({ en: "CSV", de: "CSV", es: "CSV", fr: "CSV", pt: "CSV" }),
            csvNote: t({
                en: "Table only, for spreadsheets",
                de: "Nur Tabelle, für Tabellenkalkulationen",
                es: "Solo la tabla, para hojas de cálculo",
                fr: "Tableau uniquement, pour les tableurs",
                pt: "Somente tabela, para planilhas",
            }),
            entries: t({
                en: "Every entry behind the totals",
                de: "Jeder Eintrag hinter den Summen",
                es: "Cada movimiento detrás de los totales",
                fr: "Toutes les opérations derrière les totaux",
                pt: "Todos os lançamentos por trás dos totais",
            }),
            entriesNote: insert(
                t({
                    en: "{{count}} entries",
                    de: "{{count}} Einträge",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            fileName: t({
                en: "File name",
                de: "Dateiname",
                es: "Nombre del archivo",
                fr: "Nom du fichier",
                pt: "Nome do arquivo",
            }),
            format: t({ en: "Format", de: "Format", es: "Formato", fr: "Format", pt: "Formato" }),
            pdf: t({ en: "PDF", de: "PDF", es: "PDF", fr: "PDF", pt: "PDF" }),
            pdfNote: t({
                en: "Chart and table, one page",
                de: "Diagramm und Tabelle, eine Seite",
                es: "Gráfico y tabla, una página",
                fr: "Graphique et tableau, une page",
                pt: "Gráfico e tabela, uma página",
            }),
            run: insert(
                t({
                    en: "Export {{format}}",
                    de: "{{format}} exportieren",
                    es: "Exportar {{format}}",
                    fr: "Exporter {{format}}",
                    pt: "Exportar {{format}}",
                })
            ),
            table: t({ en: "Table", de: "Tabelle", es: "Tabla", fr: "Tableau", pt: "Tabela" }),
            tableNote: insert(
                t({
                    en: "{{rows}} rows, {{columns}}",
                    de: "{{rows}} Zeilen, {{columns}}",
                    es: "{{rows}} filas, {{columns}}",
                    fr: "{{rows}} lignes, {{columns}}",
                    pt: "{{rows}} linhas, {{columns}}",
                })
            ),
            title: insert(
                t({
                    en: "Export {{name}}",
                    de: "{{name}} exportieren",
                    es: "Exportar {{name}}",
                    fr: "Exporter {{name}}",
                    pt: "Exportar {{name}}",
                })
            ),
        },
        groupings: {
            month: {
                average: t({
                    en: "Average month",
                    de: "Durchschnittsmonat",
                    es: "Mes promedio",
                    fr: "Mois moyen",
                    pt: "Mês médio",
                }),
                many: t({ en: "months", de: "Monate", es: "meses", fr: "mois", pt: "meses" }),
                name: t({ en: "Month", de: "Monat", es: "Mes", fr: "Mois", pt: "Mês" }),
                one: t({ en: "month", de: "Monat", es: "mes", fr: "mois", pt: "mês" }),
            },
            none: {
                average: t({ en: "Average", de: "Durchschnitt", es: "Promedio", fr: "Moyenne", pt: "Média" }),
                many: t({ en: "periods", de: "Zeiträume", es: "periodos", fr: "périodes", pt: "períodos" }),
                name: t({ en: "None", de: "Keine", es: "Ninguna", fr: "Aucun", pt: "Nenhum" }),
                one: t({ en: "period", de: "Zeitraum", es: "periodo", fr: "période", pt: "período" }),
            },
            quarter: {
                average: t({
                    en: "Average quarter",
                    de: "Durchschnittsquartal",
                    es: "Trimestre promedio",
                    fr: "Trimestre moyen",
                    pt: "Trimestre médio",
                }),
                many: t({ en: "quarters", de: "Quartale", es: "trimestres", fr: "trimestres", pt: "trimestres" }),
                name: t({ en: "Quarter", de: "Quartal", es: "Trimestre", fr: "Trimestre", pt: "Trimestre" }),
                one: t({ en: "quarter", de: "Quartal", es: "trimestre", fr: "trimestre", pt: "trimestre" }),
            },
            week: {
                average: t({
                    en: "Average week",
                    de: "Durchschnittswoche",
                    es: "Semana promedio",
                    fr: "Semaine moyenne",
                    pt: "Semana média",
                }),
                many: t({ en: "weeks", de: "Wochen", es: "semanas", fr: "semaines", pt: "semanas" }),
                name: t({ en: "Week", de: "Woche", es: "Semana", fr: "Semaine", pt: "Semana" }),
                one: t({ en: "week", de: "Woche", es: "semana", fr: "semaine", pt: "semana" }),
            },
            year: {
                average: t({
                    en: "Average year",
                    de: "Durchschnittsjahr",
                    es: "Año promedio",
                    fr: "Année moyenne",
                    pt: "Ano médio",
                }),
                many: t({ en: "years", de: "Jahre", es: "años", fr: "ans", pt: "anos" }),
                name: t({ en: "Year", de: "Jahr", es: "Año", fr: "Année", pt: "Ano" }),
                one: t({ en: "year", de: "Jahr", es: "año", fr: "année", pt: "ano" }),
            },
        },
        kpi: {
            entries: t({ en: "Entries", de: "Einträge", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            rise: insert(
                t({
                    en: "Biggest rise, {{from}} to {{to}}",
                    de: "Größter Anstieg, {{from}} bis {{to}}",
                    es: "Mayor alza, de {{from}} a {{to}}",
                    fr: "Plus forte hausse, de {{from}} à {{to}}",
                    pt: "Maior aumento, {{from}} a {{to}}",
                })
            ),
            riseNone: t({
                en: "Biggest rise",
                de: "Größter Anstieg",
                es: "Mayor alza",
                fr: "Plus forte hausse",
                pt: "Maior aumento",
            }),
            total: insert(
                t({
                    en: "Total, {{count}} {{unit}}",
                    de: "Gesamt, {{count}} {{unit}}",
                    es: "Total, {{count}} {{unit}}",
                    fr: "Total, {{count}} {{unit}}",
                    pt: "Total, {{count}} {{unit}}",
                })
            ),
            totalPlain: t({ en: "Total", de: "Gesamt", es: "Total", fr: "Total", pt: "Total" }),
        },
        library: {
            columns: {
                measure: t({ en: "Measure", de: "Kennzahl", es: "Medida", fr: "Mesure", pt: "Medida" }),
                opened: t({ en: "Opened", de: "Geöffnet", es: "Abierto", fr: "Ouvert le", pt: "Aberta em" }),
                range: t({ en: "Range", de: "Zeitraum", es: "Rango", fr: "Plage", pt: "Período" }),
                report: t({ en: "Report", de: "Bericht", es: "Reporte", fr: "Rapport", pt: "Relatório" }),
                rowsByColumns: t({
                    en: "Rows by columns",
                    de: "Zeilen nach Spalten",
                    es: "Filas por columnas",
                    fr: "Lignes par colonnes",
                    pt: "Linhas por colunas",
                }),
                sharing: t({ en: "Sharing", de: "Freigabe", es: "Compartido", fr: "Partage", pt: "Compartilhamento" }),
                total: t({ en: "Total", de: "Gesamt", es: "Total", fr: "Total", pt: "Total" }),
            },
            count: insert(
                t({
                    en: "{{count}} reports",
                    de: "{{count}} Berichte",
                    es: "{{count}} reportes",
                    fr: "{{count}} rapports",
                    pt: "{{count}} relatórios",
                })
            ),
            countOne: t({ en: "1 report", de: "1 Bericht", es: "1 reporte", fr: "1 rapport", pt: "1 relatório" }),
            noMatch: t({
                en: "No report is called that.",
                de: "Kein Bericht heißt so.",
                es: "Ningún reporte se llama así.",
                fr: "Aucun rapport ne porte ce nom.",
                pt: "Nenhum relatório tem esse nome.",
            }),
            search: t({
                en: "Search reports",
                de: "Berichte durchsuchen",
                es: "Buscar reportes",
                fr: "Rechercher des rapports",
                pt: "Buscar relatórios",
            }),
            sharing: {
                all: t({
                    en: "All reports",
                    de: "Alle Berichte",
                    es: "Todos los reportes",
                    fr: "Tous les rapports",
                    pt: "Todos os relatórios",
                }),
                elsewhere: insert(
                    t({
                        en: "{{count}} links are on for reports saved in another browser.",
                        de: "{{count}} Links sind für Berichte aktiv, die in einem anderen Browser gespeichert wurden.",
                        es: "Hay {{count}} enlaces activos de reportes guardados en otro navegador.",
                        fr: "{{count}} liens sont actifs pour des rapports enregistrés dans un autre navigateur.",
                        pt: "{{count}} links estão ativos para relatórios salvos em outro navegador.",
                    })
                ),
                elsewhereOne: t({
                    en: "1 link is on for a report saved in another browser.",
                    de: "1 Link ist für einen Bericht aktiv, der in einem anderen Browser gespeichert wurde.",
                    es: "Hay 1 enlace activo de un reporte guardado en otro navegador.",
                    fr: "1 lien est actif pour un rapport enregistré dans un autre navigateur.",
                    pt: "1 link está ativo para um relatório salvo em outro navegador.",
                }),
                filter: t({ en: "Shared", de: "Geteilt", es: "Compartidos", fr: "Partagé", pt: "Compartilhado" }),
                linkOn: t({ en: "Link on", de: "Link aktiv", es: "Enlace activo", fr: "Lien actif", pt: "Link ativo" }),
                none: t({
                    en: "No report matches this filter.",
                    de: "Kein Bericht passt zu diesem Filter.",
                    es: "Ningún reporte coincide con este filtro.",
                    fr: "Aucun rapport ne correspond à ce filtre.",
                    pt: "Nenhum relatório corresponde a este filtro.",
                }),
                private: t({ en: "Private", de: "Privat", es: "Privado", fr: "Privé", pt: "Privado" }),
                turnOff: t({
                    en: "Turn them off",
                    de: "Ausschalten",
                    es: "Desactivarlos",
                    fr: "Désactiver",
                    pt: "Desligar",
                }),
                turnOffOne: t({
                    en: "Turn it off",
                    de: "Ausschalten",
                    es: "Desactivarlo",
                    fr: "Désactiver",
                    pt: "Desligar",
                }),
            },
            today: t({ en: "Today", de: "Heute", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
        },
        measures: {
            average: t({
                en: "Average per entry",
                de: "Durchschnitt pro Eintrag",
                es: "Promedio por movimiento",
                fr: "Moyenne par opération",
                pt: "Média por lançamento",
            }),
            count: t({
                en: "Entry count",
                de: "Anzahl der Einträge",
                es: "Cantidad de movimientos",
                fr: "Nombre d'opérations",
                pt: "Quantidade de lançamentos",
            }),
            income: t({ en: "Income", de: "Einnahmen", es: "Ingresos", fr: "Revenus", pt: "Receitas" }),
            net: t({ en: "Net", de: "Netto", es: "Neto", fr: "Net", pt: "Líquido" }),
            spending: t({ en: "Spending", de: "Ausgaben", es: "Gastos", fr: "Dépenses", pt: "Despesas" }),
        },
        noData: {
            clear: t({
                en: "Clear filters",
                de: "Filter zurücksetzen",
                es: "Quitar filtros",
                fr: "Effacer les filtres",
                pt: "Limpar filtros",
            }),
            title: t({
                en: "Nothing matches",
                de: "Nichts passt",
                es: "No hay coincidencias",
                fr: "Aucun résultat",
                pt: "Nada corresponde",
            }),
            withFilters: insert(
                t({
                    en: "No entries match {{filters}} from {{range}}.",
                    de: "Keine Einträge passen zu {{filters}} aus {{range}}.",
                    es: "Ningún movimiento coincide con {{filters}} de {{range}}.",
                    fr: "Aucune opération ne correspond à {{filters}} sur {{range}}.",
                    pt: "Nenhum lançamento corresponde a {{filters}} em {{range}}.",
                })
            ),
            without: insert(
                t({
                    en: "No entries from {{range}}.",
                    de: "Keine Einträge aus {{range}}.",
                    es: "No hay movimientos de {{range}}.",
                    fr: "Aucune opération de {{range}}.",
                    pt: "Nenhum lançamento de {{range}}.",
                })
            ),
        },
        range: {
            allTime: t({
                en: "All time",
                de: "Gesamte Zeit",
                es: "Todo el tiempo",
                fr: "Depuis le début",
                pt: "Todo o período",
            }),
            from: t({ en: "From", de: "Von", es: "Desde", fr: "De", pt: "De" }),
            label: t({ en: "Dates", de: "Daten", es: "Fechas", fr: "Dates", pt: "Datas" }),
            last: insert(
                t({
                    en: "Last {{count}} months",
                    de: "Letzte {{count}} Monate",
                    es: "Últimos {{count}} meses",
                    fr: "{{count}} derniers mois",
                    pt: "Últimos {{count}} meses",
                })
            ),
            lastYear: t({
                en: "Last year",
                de: "Letztes Jahr",
                es: "Año pasado",
                fr: "L'année dernière",
                pt: "Ano passado",
            }),
            thisYear: t({ en: "This year", de: "Dieses Jahr", es: "Este año", fr: "Cette année", pt: "Este ano" }),
            to: t({ en: "To", de: "Bis", es: "Hasta", fr: "Vers", pt: "Para" }),
            until: insert(
                t({
                    en: "{{from}} to {{to}}",
                    de: "{{from}} bis {{to}}",
                    es: "{{from}} a {{to}}",
                    fr: "de {{from}} à {{to}}",
                    pt: "{{from}} a {{to}}",
                })
            ),
        },
        renaming: {
            save: t({ en: "Rename", de: "Umbenennen", es: "Renombrar", fr: "Renommer", pt: "Renomear" }),
            title: t({
                en: "Rename report",
                de: "Bericht umbenennen",
                es: "Renombrar reporte",
                fr: "Renommer le rapport",
                pt: "Renomear relatório",
            }),
        },
        rowMenu: {
            delete: t({ en: "Delete", de: "Löschen", es: "Eliminar", fr: "Supprimer", pt: "Excluir" }),
            duplicate: t({ en: "Duplicate", de: "Duplizieren", es: "Duplicar", fr: "Dupliquer", pt: "Duplicar" }),
            export: t({ en: "Export", de: "Exportieren", es: "Exportar", fr: "Exporter", pt: "Exportar" }),
            more: insert(
                t({
                    en: "Actions for {{name}}",
                    de: "Aktionen für {{name}}",
                    es: "Acciones de {{name}}",
                    fr: "Actions pour {{name}}",
                    pt: "Ações para {{name}}",
                })
            ),
            open: t({ en: "Open", de: "Öffnen", es: "Abrir", fr: "Ouvrir", pt: "Abrir" }),
            rename: t({ en: "Rename", de: "Umbenennen", es: "Renombrar", fr: "Renommer", pt: "Renomear" }),
            share: t({
                en: "Share link",
                de: "Link teilen",
                es: "Compartir enlace",
                fr: "Lien de partage",
                pt: "Link de compartilhamento",
            }),
        },
        saved: {
            all: t({
                en: "All reports",
                de: "Alle Berichte",
                es: "Todos los reportes",
                fr: "Tous les rapports",
                pt: "Todos os relatórios",
            }),
            copy: insert(
                t({
                    en: "{{name}} copy",
                    de: "{{name}} Kopie",
                    es: "Copia de {{name}}",
                    fr: "Copie de {{name}}",
                    pt: "Cópia de {{name}}",
                })
            ),
            none: t({
                en: "Reports you save show up here.",
                de: "Berichte, die du speicherst, erscheinen hier.",
                es: "Los reportes que guardes aparecen aquí.",
                fr: "Les rapports que vous enregistrez apparaissent ici.",
                pt: "Os relatórios que você salva aparecem aqui.",
            }),
            months: insert(
                t({
                    en: "{{count}} mo",
                    de: "{{count}} Mon.",
                    es: "{{count}} m",
                    fr: "{{count}} mois",
                    pt: "{{count}} mês",
                })
            ),
            title: t({ en: "Saved", de: "Gespeichert", es: "Guardados", fr: "Enregistré", pt: "Salvo" }),
            year: t({ en: "Year", de: "Jahr", es: "Año", fr: "Année", pt: "Ano" }),
        },
        saving: {
            cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
            dates: t({ en: "Dates", de: "Daten", es: "Fechas", fr: "Dates", pt: "Datas" }),
            fixed: t({
                en: "Keep these dates",
                de: "Diese Daten beibehalten",
                es: "Mantener estas fechas",
                fr: "Conserver ces dates",
                pt: "Manter estas datas",
            }),
            name: t({ en: "Name", de: "Name", es: "Nombre", fr: "Nom", pt: "Nome" }),
            rolling: insert(
                t({
                    en: "Always last {{count}} months",
                    de: "Immer die letzten {{count}} Monate",
                    es: "Siempre los últimos {{count}} meses",
                    fr: "Toujours les {{count}} derniers mois",
                    pt: "Sempre os últimos {{count}} meses",
                })
            ),
            save: t({
                en: "Save report",
                de: "Bericht speichern",
                es: "Guardar reporte",
                fr: "Enregistrer le rapport",
                pt: "Salvar relatório",
            }),
            title: t({
                en: "Save report",
                de: "Bericht speichern",
                es: "Guardar reporte",
                fr: "Enregistrer le rapport",
                pt: "Salvar relatório",
            }),
        },
        sharing: {
            amounts: t({
                en: "Show amounts",
                de: "Beträge anzeigen",
                es: "Mostrar montos",
                fr: "Afficher les montants",
                pt: "Mostrar valores",
            }),
            amountsHeld: t({
                en: "This report has no percentages now. The link keeps its last copy.",
                de: "Dieser Bericht hat jetzt keine Prozentwerte. Der Link behält seine letzte Kopie.",
                es: "Este reporte ya no tiene porcentajes. El enlace conserva su última copia.",
                fr: "Ce rapport n'a plus de pourcentages. Le lien garde sa dernière copie.",
                pt: "Este relatório não tem mais porcentagens. O link mantém a última cópia.",
            }),
            amountsNote: t({
                en: "Off shows percentages only.",
                de: "Aus zeigt nur Prozentwerte.",
                es: "Desactivado muestra solo porcentajes.",
                fr: "Désactivé, affiche uniquement les pourcentages.",
                pt: "Desligado, mostra apenas porcentagens.",
            }),
            copied: t({ en: "Copied", de: "Kopiert", es: "Copiado", fr: "Copié", pt: "Copiado" }),
            copy: t({ en: "Copy", de: "Kopieren", es: "Copiar", fr: "Copier", pt: "Copiar" }),
            done: t({ en: "Done", de: "Fertig", es: "Listo", fr: "Terminé", pt: "Concluído" }),
            expires: t({ en: "Expires", de: "Läuft ab", es: "Vence", fr: "Expire", pt: "Expira" }),
            failed: t({
                en: "The link could not be updated. Try again.",
                de: "Der Link konnte nicht aktualisiert werden. Versuch es noch mal.",
                es: "No se pudo actualizar el enlace. Inténtalo de nuevo.",
                fr: "Le lien n'a pas pu être mis à jour. Réessayez.",
                pt: "Não foi possível atualizar o link. Tente novamente.",
            }),
            lifetimes: {
                month: t({ en: "30 days", de: "30 Tage", es: "30 días", fr: "30 jours", pt: "30 dias" }),
                never: t({ en: "Never", de: "Nie", es: "Nunca", fr: "Jamais", pt: "Nunca" }),
                week: t({ en: "7 days", de: "7 Tage", es: "7 días", fr: "7 jours", pt: "7 dias" }),
            },
            link: t({ en: "Link on", de: "Link aktiv", es: "Enlace activo", fr: "Lien actif", pt: "Link ativo" }),
            linkNote: t({
                en: "Anyone with it can view this report.",
                de: "Jeder mit dem Link kann diesen Bericht ansehen.",
                es: "Cualquiera que lo tenga puede ver este reporte.",
                fr: "Toute personne qui l'a peut voir ce rapport.",
                pt: "Qualquer pessoa com ele pode ver este relatório.",
            }),
            title: insert(
                t({
                    en: "Share {{name}}",
                    de: "{{name}} teilen",
                    es: "Compartir {{name}}",
                    fr: "Partager {{name}}",
                    pt: "Compartilhar {{name}}",
                })
            ),
            url: t({
                en: "Link to this report",
                de: "Link zu diesem Bericht",
                es: "Enlace a este reporte",
                fr: "Lien vers ce rapport",
                pt: "Link para este relatório",
            }),
        },
        specials: {
            noAccount: t({ en: "No account", de: "Kein Konto", es: "Sin cuenta", fr: "Sans compte", pt: "Sem conta" }),
            noMerchant: t({
                en: "No merchant",
                de: "Kein Händler",
                es: "Sin comercio",
                fr: "Sans commerçant",
                pt: "Sem comerciante",
            }),
            other: t({
                en: "Everything else",
                de: "Alles andere",
                es: "Todo lo demás",
                fr: "Tout le reste",
                pt: "Todo o resto",
            }),
            untagged: t({
                en: "Untagged",
                de: "Ohne Tag",
                es: "Sin etiqueta",
                fr: "Sans étiquette",
                pt: "Sem etiqueta",
            }),
        },
        table: {
            average: t({ en: "Average", de: "Durchschnitt", es: "Promedio", fr: "Moyenne", pt: "Média" }),
            total: t({ en: "Total", de: "Gesamt", es: "Total", fr: "Total", pt: "Total" }),
            versus: insert(
                t({
                    en: "{{column}} vs average",
                    de: "{{column}} vs. Durchschnitt",
                    es: "{{column}} vs promedio",
                    fr: "{{column}} vs moyenne",
                    pt: "{{column}} vs média",
                })
            ),
        },
    },
    key: "dashboard-insights-reports",
} satisfies Dictionary;

export default dashboardInsightsReports;
