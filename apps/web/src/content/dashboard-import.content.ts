import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardImport = {
    content: {
        back: t({ en: "Back", es: "Atrás", fr: "Retour", pt: "Voltar" }),
        cancel: t({ en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        columns: {
            alreadyIn: t({
                en: "Already in Outlayr",
                es: "Ya en Outlayr",
                fr: "Déjà dans Outlayr",
                pt: "Já no Outlayr",
            }),
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            dateInFile: t({
                en: "Date in file",
                es: "Fecha en el archivo",
                fr: "Date dans le fichier",
                pt: "Data no arquivo",
            }),
            entries: t({ en: "Entries", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            firstRows: t({ en: "First rows", es: "Primeras filas", fr: "Premières lignes", pt: "Primeiras linhas" }),
            fix: t({ en: "Fix", es: "Arreglar", fr: "Corriger", pt: "Corrigir" }),
            foundBy: t({ en: "Found by", es: "Encontrado por", fr: "Trouvé par", pt: "Encontrado por" }),
            goesTo: t({ en: "Goes to", es: "Va a", fr: "Va vers", pt: "Vai para" }),
            inYourFile: t({ en: "In your file", es: "En tu archivo", fr: "Dans votre fichier", pt: "No seu arquivo" }),
            into: t({ en: "Into", es: "En", fr: "Vers", pt: "Em" }),
            merchant: t({ en: "Merchant", es: "Comercio", fr: "Commerçant", pt: "Estabelecimento" }),
            net: t({ en: "Net", es: "Neto", fr: "Net", pt: "Líquido" }),
            rows: t({ en: "Rows", es: "Filas", fr: "Lignes", pt: "Linhas" }),
            share: t({ en: "Share", es: "Porción", fr: "Part", pt: "Parcela" }),
            source: t({ en: "Source", es: "Origen", fr: "Source", pt: "Origem" }),
            status: t({ en: "Status", es: "Estado", fr: "Statut", pt: "Status" }),
            why: t({ en: "Why", es: "Por qué", fr: "Pourquoi", pt: "Por quê" }),
            written: t({ en: "Written", es: "Escrito", fr: "Écrit", pt: "Gravado" }),
        },
        continue: t({ en: "Continue", es: "Continuar", fr: "Continuer", pt: "Continuar" }),
        done: {
            aboveStatement: insert(
                t({
                    en: "{{amount}} above the statement",
                    es: "{{amount}} por encima del estado de cuenta",
                    fr: "{{amount}} au-dessus du relevé",
                    pt: "{{amount}} acima do extrato",
                })
            ),
            added: t({ en: "Added", es: "Agregados", fr: "Ajoutées", pt: "Adicionados" }),
            amountPlaceholder: t({ en: "0.00", es: "0,00", fr: "0,00", pt: "0,00" }),
            balance: insert(
                t({
                    en: "{{account}} balance",
                    es: "Saldo de {{account}}",
                    fr: "Solde {{account}}",
                    pt: "Saldo de {{account}}",
                })
            ),
            belowStatement: insert(
                t({
                    en: "{{amount}} below the statement",
                    es: "{{amount}} por debajo del estado de cuenta",
                    fr: "{{amount}} en dessous du relevé",
                    pt: "{{amount}} abaixo do extrato",
                })
            ),
            changeMind: t({
                en: "Change your mind",
                es: "¿Cambiaste de idea?",
                fr: "Vous changez d'avis",
                pt: "Mudou de ideia",
            }),
            changeMindText: t({
                en: "Removes everything this import added. What you logged since stays.",
                es: "Quita todo lo que agregó esta importación. Lo que registraste después se queda.",
                fr: "Retire tout ce que cette importation a ajouté. Ce que vous avez saisi depuis reste.",
                pt: "Remove tudo o que esta importação adicionou. O que você lançou depois fica.",
            }),
            didntMake: insert(
                t({
                    en: "{{count}} rows didn't make it",
                    es: "{{count}} filas no entraron",
                    fr: "{{count}} lignes n'ont pas été importées",
                    pt: "{{count}} linhas não entraram",
                })
            ),
            duplicatesSkipped: insert(
                t({
                    en: "{{count}} duplicates skipped",
                    es: "{{count}} duplicados omitidos",
                    fr: "{{count}} doublons ignorés",
                    pt: "{{count}} duplicados ignorados",
                })
            ),
            entriesCount: insert(
                t({
                    en: "{{count}} entries",
                    es: "{{count}} movimientos",
                    fr: "{{count}} opérations",
                    pt: "{{count}} lançamentos",
                })
            ),
            failed: t({ en: "Failed", es: "Fallidas", fr: "Échecs", pt: "Falharam" }),
            importAnother: t({
                en: "Import another",
                es: "Importar otro",
                fr: "Importer un autre",
                pt: "Importar outro",
            }),
            imported: insert(
                t({
                    en: "Imported {{date}}",
                    es: "Importado el {{date}}",
                    fr: "Importé le {{date}}",
                    pt: "Importado em {{date}}",
                })
            ),
            in: t({ en: "In", es: "Entró", fr: "Entrées", pt: "Entrou" }),
            inAndOut: t({ en: "In and out", es: "Entró y salió", fr: "Entrées et sorties", pt: "Entrou e saiu" }),
            inOutCount: insert(
                t({
                    en: "{{in}} in, {{out}} out",
                    es: "{{in}} entraron, {{out}} salieron",
                    fr: "{{in}} entrées, {{out}} sorties",
                    pt: "{{in}} entraram, {{out}} saíram",
                })
            ),
            leaveThemOut: t({
                en: "Leave them out",
                es: "Dejarlas fuera",
                fr: "Les laisser de côté",
                pt: "Deixar de fora",
            }),
            matchesStatement: t({
                en: "Matches the statement",
                es: "Coincide con el estado de cuenta",
                fr: "Correspond au relevé",
                pt: "Confere com o extrato",
            }),
            needCategory: insert(
                t({
                    en: "{{count}} need a category",
                    es: "{{count}} necesitan categoría",
                    fr: "{{count}} ont besoin d'une catégorie",
                    pt: "{{count}} precisam de categoria",
                })
            ),
            noDuplicates: t({ en: "No duplicates", es: "Sin duplicados", fr: "Aucun doublon", pt: "Sem duplicados" }),
            notWritten: insert(
                t({
                    en: "{{amount}} not written",
                    es: "{{amount}} sin escribir",
                    fr: "{{amount}} non écrit",
                    pt: "{{amount}} não gravado",
                })
            ),
            offByRows: insert(
                t({
                    en: "Off by {{amount}}, the rows above.",
                    es: "Difiere {{amount}}, las filas de arriba.",
                    fr: "Écart de {{amount}}, les lignes ci-dessus.",
                    pt: "Diferença de {{amount}}, as linhas acima.",
                })
            ),
            oneDidntMake: t({
                en: "1 row didn't make it",
                es: "1 fila no entró",
                fr: "1 ligne n'a pas été importée",
                pt: "1 linha não entrou",
            }),
            openTransactions: t({
                en: "Open transactions",
                es: "Abrir movimientos",
                fr: "Ouvrir les opérations",
                pt: "Abrir lançamentos",
            }),
            otherAreIn: insert(
                t({
                    en: "Your other {{count}} are in",
                    es: "Tus otros {{count}} ya entraron",
                    fr: "Vos {{count}} autres sont importées",
                    pt: "Seus outros {{count}} entraram",
                })
            ),
            out: t({ en: "Out", es: "Salió", fr: "Sorties", pt: "Saiu" }),
            retryNote: t({
                en: "Retry only writes the rows you fixed. Leaving them out keeps the balance off until you add them by hand.",
                es: "Reintentar solo escribe las filas que arreglaste. Si las dejas fuera, el saldo queda desfasado hasta que las agregues a mano.",
                fr: "Réessayer n'écrit que les lignes corrigées. Les laisser de côté garde l'écart de solde jusqu'à ce que vous les ajoutiez à la main.",
                pt: "Tentar de novo só grava as linhas corrigidas. Deixá-las de fora mantém o saldo diferente até você lançá-las à mão.",
            }),
            retryOne: t({
                en: "Retry 1 row",
                es: "Reintentar 1 fila",
                fr: "Réessayer 1 ligne",
                pt: "Tentar 1 linha de novo",
            }),
            retryRows: insert(
                t({
                    en: "Retry {{count}} rows",
                    es: "Reintentar {{count}} filas",
                    fr: "Réessayer {{count}} lignes",
                    pt: "Tentar {{count}} linhas de novo",
                })
            ),
            reviewN: insert(
                t({
                    en: "Review {{count}}",
                    es: "Revisar {{count}}",
                    fr: "Vérifier {{count}}",
                    pt: "Revisar {{count}}",
                })
            ),
            undoneTitle: t({
                en: "This import was undone",
                es: "Esta importación se deshizo",
                fr: "Cette importation a été annulée",
                pt: "Esta importação foi desfeita",
            }),
            unreadableAmount: t({
                en: "Unreadable amount",
                es: "Monto ilegible",
                fr: "Montant illisible",
                pt: "Valor ilegível",
            }),
            unreadableDate: t({
                en: "Unreadable date",
                es: "Fecha ilegible",
                fr: "Date illisible",
                pt: "Data ilegível",
            }),
            whereItWent: t({ en: "Where it went", es: "A dónde fue", fr: "Où c'est parti", pt: "Para onde foi" }),
        },
        history: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            allAccounts: t({
                en: "All accounts",
                es: "Todas las cuentas",
                fr: "Tous les comptes",
                pt: "Todas as contas",
            }),
            allSources: t({
                en: "All sources",
                es: "Todos los orígenes",
                fr: "Toutes les sources",
                pt: "Todas as origens",
            }),
            anyTime: t({ en: "Any time", es: "Cualquier fecha", fr: "N'importe quand", pt: "Qualquer data" }),
            balanceCheck: t({
                en: "Balance check",
                es: "Revisión de saldo",
                fr: "Contrôle du solde",
                pt: "Conferência de saldo",
            }),
            count: insert(
                t({
                    en: "{{count}} imports",
                    es: "{{count}} importaciones",
                    fr: "{{count}} importations",
                    pt: "{{count}} importações",
                })
            ),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            dismiss: t({ en: "Dismiss", es: "Cerrar", fr: "Fermer", pt: "Fechar" }),
            entries: t({ en: "Entries", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
            entriesAdded: t({
                en: "Entries added",
                es: "Movimientos agregados",
                fr: "Opérations ajoutées",
                pt: "Lançamentos adicionados",
            }),
            importUndone: t({
                en: "Import undone",
                es: "Importación deshecha",
                fr: "Importation annulée",
                pt: "Importação desfeita",
            }),
            imports: t({ en: "Imports", es: "Importaciones", fr: "Importations", pt: "Importações" }),
            in: t({ en: "In", es: "Entró", fr: "Entrées", pt: "Entrou" }),
            last30: t({ en: "Last 30 days", es: "Últimos 30 días", fr: "30 derniers jours", pt: "Últimos 30 dias" }),
            lastImport: t({
                en: "Last import",
                es: "Última importación",
                fr: "Dernière importation",
                pt: "Última importação",
            }),
            matches: t({ en: "Matches", es: "Coincide", fr: "Correspond", pt: "Confere" }),
            never: t({ en: "Never", es: "Nunca", fr: "Jamais", pt: "Nunca" }),
            newImport: t({
                en: "New import",
                es: "Nueva importación",
                fr: "Nouvelle importation",
                pt: "Nova importação",
            }),
            noImports: t({
                en: "No imports yet",
                es: "Aún no hay importaciones",
                fr: "Aucune importation pour l'instant",
                pt: "Nenhuma importação ainda",
            }),
            noImportsHint: t({
                en: "Bring in a CSV, a bank statement or a Money Manager backup.",
                es: "Trae un CSV, un estado de cuenta o un respaldo de Money Manager.",
                fr: "Importez un CSV, un relevé bancaire ou une sauvegarde Money Manager.",
                pt: "Traga um CSV, um extrato ou um backup do Money Manager.",
            }),
            noMatch: t({
                en: "No imports match these filters.",
                es: "Ninguna importación coincide con estos filtros.",
                fr: "Aucune importation ne correspond à ces filtres.",
                pt: "Nenhuma importação corresponde a esses filtros.",
            }),
            offBy: insert(
                t({
                    en: "Off by {{amount}}",
                    es: "Difiere {{amount}}",
                    fr: "Écart de {{amount}}",
                    pt: "Diferença de {{amount}}",
                })
            ),
            one: t({ en: "1 import", es: "1 importación", fr: "1 importation", pt: "1 importação" }),
            onlyLast: t({
                en: "Only your last import can be undone.",
                es: "Solo se puede deshacer tu última importación.",
                fr: "Seule votre dernière importation peut être annulée.",
                pt: "Só a última importação pode ser desfeita.",
            }),
            out: t({ en: "Out", es: "Salió", fr: "Sorties", pt: "Saiu" }),
            readBy: t({ en: "Read by", es: "Leído por", fr: "Lu par", pt: "Lido por" }),
            readByAi: t({
                en: "Our AI provider",
                es: "Nuestro proveedor de IA",
                fr: "Notre fournisseur d'IA",
                pt: "Nosso provedor de IA",
            }),
            readByDevice: t({ en: "This device", es: "Este dispositivo", fr: "Cet appareil", pt: "Este dispositivo" }),
            readByNotion: t({ en: "Notion", es: "Notion", fr: "Notion", pt: "Notion" }),
            seeEntries: insert(
                t({
                    en: "See {{count}} entries",
                    es: "Ver {{count}} movimientos",
                    fr: "Voir {{count}} opérations",
                    pt: "Ver {{count}} lançamentos",
                })
            ),
            source: t({ en: "Source", es: "Origen", fr: "Source", pt: "Origem" }),
            thisYear: t({ en: "This year", es: "Este año", fr: "Cette année", pt: "Este ano" }),
            undone: t({ en: "Undone", es: "Deshechas", fr: "Annulées", pt: "Desfeitas" }),
        },
        home: {
            accounts: insert(
                t({
                    en: "{{count}} accounts",
                    es: "{{count}} cuentas",
                    fr: "{{count}} comptes",
                    pt: "{{count}} contas",
                })
            ),
            anotherApp: t({ en: "Another app?", es: "¿Otra app?", fr: "Une autre app ?", pt: "Outro app?" }),
            anotherAppText: t({
                en: "Tell us which one and we will look at it.",
                es: "Dinos cuál y la revisamos.",
                fr: "Dites-nous laquelle et nous l'étudierons.",
                pt: "Diga qual e vamos olhar.",
            }),
            chooseFile: t({
                en: "Choose a file",
                es: "Elegir un archivo",
                fr: "Choisir un fichier",
                pt: "Escolher um arquivo",
            }),
            dropAnywhere: t({
                en: "Drop a CSV or PDF anywhere",
                es: "Suelta un CSV o PDF en cualquier parte",
                fr: "Déposez un CSV ou un PDF n'importe où",
                pt: "Solte um CSV ou PDF em qualquer lugar",
            }),
            dropAnywhereHint: t({
                en: "We pick the right path from the file.",
                es: "Elegimos el camino según el archivo.",
                fr: "Nous choisissons la bonne voie selon le fichier.",
                pt: "Escolhemos o caminho certo pelo arquivo.",
            }),
            dropHere: t({
                en: "Drop to import it",
                es: "Suelta para importarlo",
                fr: "Déposez pour l'importer",
                pt: "Solte para importar",
            }),
            duplicatesSkipped: t({
                en: "Duplicates skipped",
                es: "Duplicados omitidos",
                fr: "Doublons ignorés",
                pt: "Duplicados ignorados",
            }),
            entriesInto: insert(
                t({
                    en: "{{count}} entries into {{account}}",
                    es: "{{count}} movimientos en {{account}}",
                    fr: "{{count}} opérations dans {{account}}",
                    pt: "{{count}} lançamentos em {{account}}",
                })
            ),
            forget: t({
                en: "Remove from history",
                es: "Quitar del historial",
                fr: "Retirer de l'historique",
                pt: "Remover do histórico",
            }),
            lastImport: t({
                en: "Last import",
                es: "Última importación",
                fr: "Dernière importation",
                pt: "Última importação",
            }),
            net: t({ en: "Net", es: "Neto", fr: "Net", pt: "Líquido" }),
            noAccount: t({ en: "No account", es: "Sin cuenta", fr: "Sans compte", pt: "Sem conta" }),
            privacy: t({ en: "Privacy", es: "Privacidad", fr: "Confidentialité", pt: "Privacidade" }),
            privacyText: t({
                en: "CSV files are read on this device. A PDF statement's text goes to our AI provider, and the file is deleted after reading.",
                es: "Los CSV se leen en este dispositivo. El texto de un estado de cuenta en PDF va a nuestro proveedor de IA, y el archivo se borra después de leerlo.",
                fr: "Les fichiers CSV sont lus sur cet appareil. Le texte d'un relevé PDF est envoyé à notre fournisseur d'IA, et le fichier est supprimé après lecture.",
                pt: "Arquivos CSV são lidos neste dispositivo. O texto de um extrato em PDF vai para nosso provedor de IA, e o arquivo é apagado depois da leitura.",
            }),
            recent: t({
                en: "Recent imports",
                es: "Importaciones recientes",
                fr: "Importations récentes",
                pt: "Importações recentes",
            }),
            seeAll: t({ en: "See all", es: "Ver todo", fr: "Tout voir", pt: "Ver tudo" }),
            seeEntries: t({
                en: "See entries",
                es: "Ver movimientos",
                fr: "Voir les opérations",
                pt: "Ver lançamentos",
            }),
            tellUs: t({ en: "Tell us which one", es: "Dinos cuál", fr: "Dites-nous laquelle", pt: "Diga qual" }),
            undoImport: t({
                en: "Undo import",
                es: "Deshacer importación",
                fr: "Annuler l'importation",
                pt: "Desfazer importação",
            }),
            unknownFile: t({
                en: "Outlayr reads CSV, PDF and Money Manager backups.",
                es: "Outlayr lee CSV, PDF y respaldos de Money Manager.",
                fr: "Outlayr lit les CSV, les PDF et les sauvegardes Money Manager.",
                pt: "O Outlayr lê CSV, PDF e backups do Money Manager.",
            }),
        },
        importing: {
            button: t({ en: "Importing…", es: "Importando…", fr: "Importation…", pt: "Importando…" }),
            keepOpen: t({
                en: "They show in your ledger now. Keep this tab open until they're saved.",
                es: "Ya aparecen en tu registro. Mantén esta pestaña abierta hasta que se guarden.",
                fr: "Elles apparaissent déjà dans votre registre. Gardez cet onglet ouvert jusqu'à leur enregistrement.",
                pt: "Já aparecem no seu registro. Mantenha esta aba aberta até serem salvos.",
            }),
            noCategory: t({ en: "No category", es: "Sin categoría", fr: "Sans catégorie", pt: "Sem categoria" }),
            title: insert(
                t({
                    en: "Importing {{count}} transactions…",
                    es: "Importando {{count}} movimientos…",
                    fr: "Importation de {{count}} opérations…",
                    pt: "Importando {{count}} lançamentos…",
                })
            ),
        },
        match: {
            amountShort: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            bothWays: insert(
                t({
                    en: "All {{count}} rows work both ways",
                    es: "Las {{count}} filas funcionan de ambas formas",
                    fr: "Les {{count}} lignes fonctionnent dans les deux sens",
                    pt: "As {{count}} linhas funcionam dos dois jeitos",
                })
            ),
            categoryCard: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
            categoryColumn: insert(
                t({
                    en: "Categories come from the {{column}} column. Names you don't have yet are created.",
                    es: "Las categorías vienen de la columna {{column}}. Las que aún no tienes se crean.",
                    fr: "Les catégories viennent de la colonne {{column}}. Celles que vous n'avez pas encore sont créées.",
                    pt: "As categorias vêm da coluna {{column}}. As que você ainda não tem são criadas.",
                })
            ),
            chooseDifferent: t({
                en: "Choose a different file",
                es: "Elegir otro archivo",
                fr: "Choisir un autre fichier",
                pt: "Escolher outro arquivo",
            }),
            createAccount: t({ en: "Create account", es: "Crear cuenta", fr: "Créer un compte", pt: "Criar conta" }),
            dayFirst: t({ en: "Day first", es: "Día primero", fr: "Jour d'abord", pt: "Dia primeiro" }),
            field: {
                account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
                amount: t({ en: "Amount, signed", es: "Monto, con signo", fr: "Montant signé", pt: "Valor com sinal" }),
                amountIn: t({ en: "Amount in", es: "Monto que entra", fr: "Montant entrant", pt: "Valor de entrada" }),
                amountOut: t({ en: "Amount out", es: "Monto que sale", fr: "Montant sortant", pt: "Valor de saída" }),
                balance: t({ en: "Balance", es: "Saldo", fr: "Solde", pt: "Saldo" }),
                category: t({ en: "Category", es: "Categoría", fr: "Catégorie", pt: "Categoria" }),
                currency: t({ en: "Currency", es: "Moneda", fr: "Devise", pt: "Moeda" }),
                date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
                merchant: t({ en: "Merchant", es: "Comercio", fr: "Commerçant", pt: "Estabelecimento" }),
                skip: t({ en: "Skip", es: "Omitir", fr: "Ignorer", pt: "Ignorar" }),
                type: t({
                    en: "Income or expense",
                    es: "Ingreso o gasto",
                    fr: "Revenu ou dépense",
                    pt: "Receita ou despesa",
                }),
            },
            fromColumn: insert(
                t({
                    en: "From the {{column}} column",
                    es: "De la columna {{column}}",
                    fr: "De la colonne {{column}}",
                    pt: "Da coluna {{column}}",
                })
            ),
            gap: {
                amount: t({
                    en: "No amount column",
                    es: "Sin columna de monto",
                    fr: "Pas de colonne de montant",
                    pt: "Sem coluna de valor",
                }),
                date: t({
                    en: "No date column",
                    es: "Sin columna de fecha",
                    fr: "Pas de colonne de date",
                    pt: "Sem coluna de data",
                }),
                label: t({
                    en: "No description or category column",
                    es: "Sin columna de descripción o categoría",
                    fr: "Pas de colonne de description ou de catégorie",
                    pt: "Sem coluna de descrição ou categoria",
                }),
            },
            intoAccount: t({ en: "Into account", es: "En la cuenta", fr: "Vers le compte", pt: "Na conta" }),
            missing: insert(
                t({
                    en: "We couldn't find the right columns. {{gaps}}: pick one below, or choose a file that already has one.",
                    es: "No encontramos las columnas correctas. {{gaps}}: elige una abajo, o escoge un archivo que ya la tenga.",
                    fr: "Nous n'avons pas trouvé les bonnes colonnes. {{gaps}} : choisissez-en une ci-dessous, ou un fichier qui en a déjà une.",
                    pt: "Não encontramos as colunas certas. {{gaps}}: escolha uma abaixo, ou um arquivo que já tenha.",
                })
            ),
            monthFirst: t({ en: "Month first", es: "Mes primero", fr: "Mois d'abord", pt: "Mês primeiro" }),
            need: {
                amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
                date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
                label: t({
                    en: "Description or category",
                    es: "Descripción o categoría",
                    fr: "Description ou catégorie",
                    pt: "Descrição ou categoria",
                }),
            },
            needed: t({ en: "Needed", es: "Necesario", fr: "Requis", pt: "Necessário" }),
            needsChoice: t({
                en: "Needs a choice",
                es: "Necesita una elección",
                fr: "Choix requis",
                pt: "Precisa de uma escolha",
            }),
            noAccountNote: t({
                en: "Entries come in without an account.",
                es: "Los movimientos entran sin cuenta.",
                fr: "Les opérations arrivent sans compte.",
                pt: "Os lançamentos entram sem conta.",
            }),
            noCategoryColumn: insert(
                t({
                    en: "No category column, so we'll read the {{column}} column instead.",
                    es: "No hay columna de categoría, así que leeremos la columna {{column}}.",
                    fr: "Pas de colonne de catégorie, nous lirons donc la colonne {{column}}.",
                    pt: "Sem coluna de categoria, então vamos ler a coluna {{column}}.",
                })
            ),
            noPreview: t({
                en: "No preview yet",
                es: "Aún no hay vista previa",
                fr: "Pas encore d'aperçu",
                pt: "Ainda sem prévia",
            }),
            noPreviewHint: t({
                en: "It shows up once all three are matched.",
                es: "Aparece cuando las tres estén asignadas.",
                fr: "Il s'affiche une fois les trois associées.",
                pt: "Aparece quando as três estiverem associadas.",
            }),
            none: t({ en: "None", es: "Ninguna", fr: "Aucun", pt: "Nenhuma" }),
            pickField: t({ en: "Pick a field", es: "Elige un campo", fr: "Choisir un champ", pt: "Escolha um campo" }),
            preview: t({ en: "Preview", es: "Vista previa", fr: "Aperçu", pt: "Prévia" }),
            previewCount: insert(
                t({
                    en: "{{shown}} of {{total}} rows",
                    es: "{{shown}} de {{total}} filas",
                    fr: "{{shown}} sur {{total}} lignes",
                    pt: "{{shown}} de {{total}} linhas",
                })
            ),
            required: insert(
                t({
                    en: "{{count}} of 3 required",
                    es: "{{count}} de 3 requeridas",
                    fr: "{{count}} sur 3 requises",
                    pt: "{{count}} de 3 obrigatórias",
                })
            ),
            spreads: insert(
                t({
                    en: "{{order}} spreads them across {{count}} months",
                    es: "{{order}} las reparte en {{count}} meses",
                    fr: "{{order}} les répartit sur {{count}} mois",
                    pt: "{{order}} espalha em {{count}} meses",
                })
            ),
            title: t({
                en: "Match columns",
                es: "Asignar columnas",
                fr: "Associer les colonnes",
                pt: "Associar colunas",
            }),
            unreadableDates: insert(
                t({
                    en: "The {{column}} column doesn't read as dates. Pick the column that does.",
                    es: "La columna {{column}} no se lee como fechas. Elige la que sí.",
                    fr: "La colonne {{column}} ne se lit pas comme des dates. Choisissez celle qui l'est.",
                    pt: "A coluna {{column}} não é lida como datas. Escolha a que é.",
                })
            ),
            whichFirst: t({
                en: "Which comes first in your dates?",
                es: "¿Qué va primero en tus fechas?",
                fr: "Qu'est-ce qui vient en premier dans vos dates ?",
                pt: "O que vem primeiro nas suas datas?",
            }),
            whyAsk: t({
                en: "Why we ask",
                es: "Por qué preguntamos",
                fr: "Pourquoi nous demandons",
                pt: "Por que perguntamos",
            }),
            whyAskText: t({
                en: "No day in this file goes past 12, so it can't tell us. Your choice applies to every row.",
                es: "Ningún día de este archivo pasa de 12, así que no lo sabemos. Tu elección aplica a todas las filas.",
                fr: "Aucun jour de ce fichier ne dépasse 12, il ne peut donc pas nous le dire. Votre choix s'applique à chaque ligne.",
                pt: "Nenhum dia deste arquivo passa de 12, então ele não diz. Sua escolha vale para todas as linhas.",
            }),
        },
        notion: {
            connect: t({ en: "Connect", es: "Conectar", fr: "Connecter", pt: "Conectar" }),
            connectFailed: t({
                en: "Notion didn't connect. Try again.",
                es: "Notion no se conectó. Intenta de nuevo.",
                fr: "Notion ne s'est pas connecté. Réessayez.",
                pt: "O Notion não conectou. Tente de novo.",
            }),
            connectHint: t({
                en: "Links your Notion workspace",
                es: "Vincula tu espacio de trabajo de Notion",
                fr: "Associe votre espace de travail Notion",
                pt: "Vincula seu espaço de trabalho do Notion",
            }),
            connectNotion: t({
                en: "Connect Notion",
                es: "Conectar Notion",
                fr: "Connecter Notion",
                pt: "Conectar Notion",
            }),
            continueUpload: t({
                en: "Choose the zip",
                es: "Elegir el zip",
                fr: "Choisir le zip",
                pt: "Escolher o zip",
            }),
            countOf: insert(
                t({
                    en: "{{picked}} of {{total}}",
                    es: "{{picked}} de {{total}}",
                    fr: "{{picked}} sur {{total}}",
                    pt: "{{picked}} de {{total}}",
                })
            ),
            databases: t({ en: "Databases", es: "Bases de datos", fr: "Bases de données", pt: "Bancos de dados" }),
            disconnect: t({
                en: "Disconnect Notion",
                es: "Desconectar Notion",
                fr: "Déconnecter Notion",
                pt: "Desconectar Notion",
            }),
            error: {
                noLedger: t({
                    en: "None of these has a date and an amount column.",
                    es: "Ninguna tiene columna de fecha y de monto.",
                    fr: "Aucune n'a de colonne de date et de montant.",
                    pt: "Nenhum tem coluna de data e valor.",
                }),
                rateLimited: t({
                    en: "Notion is busy. Try again in a minute.",
                    es: "Notion está ocupado. Intenta en un minuto.",
                    fr: "Notion est occupé. Réessayez dans une minute.",
                    pt: "O Notion está ocupado. Tente em um minuto.",
                }),
                revoked: t({
                    en: "Notion access was removed. Connect again.",
                    es: "Se quitó el acceso a Notion. Conéctalo de nuevo.",
                    fr: "L'accès à Notion a été retiré. Reconnectez-le.",
                    pt: "O acesso ao Notion foi removido. Conecte de novo.",
                }),
                unavailable: t({
                    en: "Notion didn't answer. Try again.",
                    es: "Notion no respondió. Intenta de nuevo.",
                    fr: "Notion n'a pas répondu. Réessayez.",
                    pt: "O Notion não respondeu. Tente de novo.",
                }),
                zip: t({
                    en: "This zip has no CSV from Notion in it.",
                    es: "Este zip no trae ningún CSV de Notion.",
                    fr: "Ce zip ne contient aucun CSV de Notion.",
                    pt: "Este zip não tem nenhum CSV do Notion.",
                }),
            },
            importDatabases: insert(
                t({
                    en: "Import {{count}} databases",
                    es: "Importar {{count}} bases de datos",
                    fr: "Importer {{count}} bases de données",
                    pt: "Importar {{count}} bancos de dados",
                })
            ),
            importOne: t({
                en: "Import 1 database",
                es: "Importar 1 base de datos",
                fr: "Importer 1 base de données",
                pt: "Importar 1 banco de dados",
            }),
            loading: t({
                en: "Reading your workspace…",
                es: "Leyendo tu espacio de trabajo…",
                fr: "Lecture de votre espace de travail…",
                pt: "Lendo seu espaço de trabalho…",
            }),
            more: t({ en: "More", es: "Más", fr: "Plus", pt: "Mais" }),
            noDatabases: t({
                en: "No databases are shared with Outlayr yet.",
                es: "Aún no hay bases de datos compartidas con Outlayr.",
                fr: "Aucune base de données n'est encore partagée avec Outlayr.",
                pt: "Nenhum banco de dados foi compartilhado com o Outlayr ainda.",
            }),
            noDateAmount: t({
                en: "No date or amount column",
                es: "Sin columna de fecha o monto",
                fr: "Pas de colonne de date ou de montant",
                pt: "Sem coluna de data ou valor",
            }),
            reading: t({ en: "Reading…", es: "Leyendo…", fr: "Lecture…", pt: "Lendo…" }),
            shareMore: t({
                en: "Share more pages in Notion",
                es: "Compartir más páginas en Notion",
                fr: "Partager plus de pages dans Notion",
                pt: "Compartilhar mais páginas no Notion",
            }),
            text: t({
                en: "Pick databases in Notion and import them. Import again any time, no files.",
                es: "Elige bases de datos en Notion e impórtalas. Vuelve a importar cuando quieras, sin archivos.",
                fr: "Choisissez des bases de données dans Notion et importez-les. Réimportez quand vous voulez, sans fichier.",
                pt: "Escolha bancos de dados no Notion e importe. Importe de novo quando quiser, sem arquivos.",
            }),
            title: t({ en: "Notion", es: "Notion", fr: "Notion", pt: "Notion" }),
            uploadExport: t({
                en: "Upload a Notion export",
                es: "Subir una exportación de Notion",
                fr: "Importer un export Notion",
                pt: "Enviar uma exportação do Notion",
            }),
            uploadExportHint: t({
                en: "Markdown & CSV zip",
                es: "Zip de Markdown y CSV",
                fr: "Zip Markdown et CSV",
                pt: "Zip de Markdown e CSV",
            }),
            workspace: t({
                en: "Your workspace",
                es: "Tu espacio de trabajo",
                fr: "Votre espace de travail",
                pt: "Seu espaço de trabalho",
            }),
        },
        openSettings: t({ en: "Open Settings", es: "Abrir Ajustes", fr: "Ouvrir les réglages", pt: "Abrir Ajustes" }),
        resolve: {
            accounts: t({ en: "Accounts", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
            all: t({ en: "All", es: "Todos", fr: "Tous", pt: "Todos" }),
            alreadyIn: t({
                en: "Already in Outlayr",
                es: "Ya en Outlayr",
                fr: "Déjà dans Outlayr",
                pt: "Já no Outlayr",
            }),
            askedModel: t({
                en: "Asked the model",
                es: "Consulta al modelo",
                fr: "Modèle consulté",
                pt: "Consulta ao modelo",
            }),
            asking: t({ en: "Asking…", es: "Consultando…", fr: "En cours…", pt: "Consultando…" }),
            bringAs: t({ en: "Bring it in as", es: "Traerla como", fr: "L'importer comme", pt: "Trazer como" }),
            found: {
                ai: t({ en: "AI", es: "IA", fr: "IA", pt: "IA" }),
                entries: t({ en: "Your entries", es: "Tus movimientos", fr: "Vos opérations", pt: "Seus lançamentos" }),
                file: t({ en: "Your file", es: "Tu archivo", fr: "Votre fichier", pt: "Seu arquivo" }),
                none: t({ en: "Nothing yet", es: "Nada aún", fr: "Rien pour l'instant", pt: "Nada ainda" }),
                rule: t({ en: "A rule", es: "Una regla", fr: "Une règle", pt: "Uma regra" }),
                you: t({ en: "You", es: "Tú", fr: "Vous", pt: "Você" }),
            },
            fromAi: t({ en: "From AI", es: "De la IA", fr: "De l'IA", pt: "Da IA" }),
            leaveForLater: insert(
                t({
                    en: "Leave the {{count}} for later",
                    es: "Dejar los {{count}} para después",
                    fr: "Laisser les {{count}} pour plus tard",
                    pt: "Deixar os {{count}} para depois",
                })
            ),
            leaveOut: t({ en: "Leave it out", es: "Dejarla fuera", fr: "La laisser de côté", pt: "Deixar de fora" }),
            leftForLater: insert(
                t({
                    en: "{{count}} left without a category",
                    es: "{{count}} quedan sin categoría",
                    fr: "{{count}} restent sans catégorie",
                    pt: "{{count}} ficam sem categoria",
                })
            ),
            matched: t({ en: "Matched", es: "Asignados", fr: "Associés", pt: "Associados" }),
            matchedCount: insert(
                t({
                    en: "{{matched}} of {{total}}",
                    es: "{{matched}} de {{total}}",
                    fr: "{{matched}} sur {{total}}",
                    pt: "{{matched}} de {{total}}",
                })
            ),
            matchedOnDevice: t({
                en: "Matched on device",
                es: "Asignados en el dispositivo",
                fr: "Associés sur l'appareil",
                pt: "Associados no dispositivo",
            }),
            newAccount: t({
                en: "A new account",
                es: "Una cuenta nueva",
                fr: "Un nouveau compte",
                pt: "Uma conta nova",
            }),
            newCard: t({
                en: "A new card or loan",
                es: "Una tarjeta o préstamo nuevo",
                fr: "Une nouvelle carte ou un prêt",
                pt: "Um cartão ou empréstimo novo",
            }),
            newCategory: insert(
                t({
                    en: 'New category "{{name}}"',
                    es: 'Nueva categoría "{{name}}"',
                    fr: "Nouvelle catégorie « {{name}} »",
                    pt: 'Nova categoria "{{name}}"',
                })
            ),
            noCategory: t({ en: "No category", es: "Sin categoría", fr: "Sans catégorie", pt: "Sem categoria" }),
            oneRow: t({ en: "1 row", es: "1 fila", fr: "1 ligne", pt: "1 linha" }),
            otherReasons: t({ en: "Other reasons", es: "Otras razones", fr: "Autres raisons", pt: "Outros motivos" }),
            pickAccount: t({
                en: "Pick an account",
                es: "Elige una cuenta",
                fr: "Choisir un compte",
                pt: "Escolha uma conta",
            }),
            pickCategory: t({
                en: "Pick category",
                es: "Elegir categoría",
                fr: "Choisir une catégorie",
                pt: "Escolher categoria",
            }),
            preparing: t({ en: "Preparing", es: "Preparando", fr: "Préparation", pt: "Preparando" }),
            privacyLine: t({
                en: "Only unmatched merchant names and your category names are sent. Never your amounts, dates, or the file itself.",
                es: "Solo se envían los nombres de comercios sin asignar y los nombres de tus categorías. Nunca tus montos, fechas ni el archivo.",
                fr: "Seuls les noms de commerçants non associés et vos noms de catégories sont envoyés. Jamais vos montants, dates, ni le fichier.",
                pt: "Só os nomes de estabelecimentos sem associação e os nomes das suas categorias são enviados. Nunca seus valores, datas ou o arquivo.",
            }),
            readFile: t({ en: "Read the file", es: "Leer el archivo", fr: "Lire le fichier", pt: "Ler o arquivo" }),
            readRows: insert(
                t({ en: "{{count}} rows", es: "{{count}} filas", fr: "{{count}} lignes", pt: "{{count}} linhas" })
            ),
            reason: {
                aiOff: t({ en: "AI off", es: "IA desactivada", fr: "IA désactivée", pt: "IA desativada" }),
                aiOffHint: t({
                    en: "Off in Settings.",
                    es: "Desactivada en Ajustes.",
                    fr: "Désactivée dans les réglages.",
                    pt: "Desativada em Ajustes.",
                }),
                offline: t({ en: "Offline", es: "Sin conexión", fr: "Hors ligne", pt: "Offline" }),
                offlineHint: t({
                    en: "You're offline.",
                    es: "No tienes conexión.",
                    fr: "Vous êtes hors ligne.",
                    pt: "Você está offline.",
                }),
                rateLimit: t({ en: "Rate limit", es: "Límite", fr: "Limite", pt: "Limite" }),
                rateLimitHint: t({
                    en: "Too many imports this hour.",
                    es: "Demasiadas importaciones en esta hora.",
                    fr: "Trop d'importations cette heure-ci.",
                    pt: "Importações demais nesta hora.",
                }),
                timeout: t({ en: "Timeout", es: "Tiempo agotado", fr: "Délai dépassé", pt: "Tempo esgotado" }),
                timeoutHint: t({
                    en: "It took too long.",
                    es: "Tardó demasiado.",
                    fr: "Cela a pris trop de temps.",
                    pt: "Demorou demais.",
                }),
                tooLarge: t({ en: "Too large", es: "Muy grande", fr: "Trop volumineux", pt: "Grande demais" }),
                tooLargeHint: t({
                    en: "Read on your device only.",
                    es: "Leído solo en tu dispositivo.",
                    fr: "Lu uniquement sur votre appareil.",
                    pt: "Lido só no seu dispositivo.",
                }),
            },
            reviewCount: insert(
                t({
                    en: "Review {{count}} transactions",
                    es: "Revisar {{count}} movimientos",
                    fr: "Vérifier {{count}} opérations",
                    pt: "Revisar {{count}} lançamentos",
                })
            ),
            rowsCount: insert(
                t({ en: "{{count}} rows", es: "{{count}} filas", fr: "{{count}} lignes", pt: "{{count}} linhas" })
            ),
            sent: insert(
                t({ en: "{{count}} sent", es: "{{count}} enviados", fr: "{{count}} envoyés", pt: "{{count}} enviados" })
            ),
            showMore: t({ en: "Show more", es: "Mostrar más", fr: "Afficher plus", pt: "Mostrar mais" }),
            showing: insert(
                t({
                    en: "Showing {{shown}} of {{total}} merchants",
                    es: "Mostrando {{shown}} de {{total}} comercios",
                    fr: "{{shown}} commerçants sur {{total}}",
                    pt: "Mostrando {{shown}} de {{total}} estabelecimentos",
                })
            ),
            skipped: t({ en: "Off", es: "Desactivado", fr: "Désactivé", pt: "Desativado" }),
            stillHere: t({
                en: "What matched on your device is still here.",
                es: "Lo que se asignó en tu dispositivo sigue aquí.",
                fr: "Ce qui a été associé sur votre appareil est toujours là.",
                pt: "O que foi associado no seu dispositivo continua aqui.",
            }),
            turnOnAi: t({ en: "Turn on", es: "Activar", fr: "Activer", pt: "Ativar" }),
            unavailable: t({
                en: "Suggestions are unavailable.",
                es: "Las sugerencias no están disponibles.",
                fr: "Les suggestions ne sont pas disponibles.",
                pt: "As sugestões não estão disponíveis.",
            }),
            unavailableWhy: {
                aiOff: t({
                    en: "Sending data to AI providers is off in Settings.",
                    es: "Enviar datos a proveedores de IA está desactivado en Ajustes.",
                    fr: "L'envoi aux fournisseurs d'IA est désactivé dans les réglages.",
                    pt: "Enviar dados a provedores de IA está desativado em Ajustes.",
                }),
                offline: t({
                    en: "You're offline.",
                    es: "No tienes conexión.",
                    fr: "Vous êtes hors ligne.",
                    pt: "Você está offline.",
                }),
                providerError: t({
                    en: "The service didn't answer.",
                    es: "El servicio no respondió.",
                    fr: "Le service n'a pas répondu.",
                    pt: "O serviço não respondeu.",
                }),
                rateLimited: t({
                    en: "Too many imports this hour.",
                    es: "Demasiadas importaciones en esta hora.",
                    fr: "Trop d'importations cette heure-ci.",
                    pt: "Importações demais nesta hora.",
                }),
            },
        },
        review: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            addAnother: t({
                en: "Add another file",
                es: "Agregar otro archivo",
                fr: "Ajouter un autre fichier",
                pt: "Adicionar outro arquivo",
            }),
            added: t({ en: "Added", es: "Agregado", fr: "Ajouté", pt: "Adicionado" }),
            all: t({ en: "All", es: "Todos", fr: "Tous", pt: "Todos" }),
            balanceCheck: t({
                en: "Balance check",
                es: "Revisión de saldo",
                fr: "Contrôle du solde",
                pt: "Conferência de saldo",
            }),
            byHand: t({ en: "Logged by hand", es: "Registrado a mano", fr: "Saisi à la main", pt: "Lançado à mão" }),
            currency: t({ en: "Currency", es: "Moneda", fr: "Devise", pt: "Moeda" }),
            duplicates: t({ en: "Duplicates", es: "Duplicados", fr: "Doublons", pt: "Duplicados" }),
            importAnyway: t({
                en: "Import anyway",
                es: "Importar igual",
                fr: "Importer quand même",
                pt: "Importar mesmo assim",
            }),
            importCount: insert(
                t({
                    en: "Import {{count}} entries",
                    es: "Importar {{count}} movimientos",
                    fr: "Importer {{count}} opérations",
                    pt: "Importar {{count}} lançamentos",
                })
            ),
            importOne: t({
                en: "Import 1 entry",
                es: "Importar 1 movimiento",
                fr: "Importer 1 opération",
                pt: "Importar 1 lançamento",
            }),
            inOutlayr: t({ en: "In Outlayr", es: "En Outlayr", fr: "Dans Outlayr", pt: "No Outlayr" }),
            inThisFile: t({ en: "In this file", es: "En este archivo", fr: "Dans ce fichier", pt: "Neste arquivo" }),
            keptNote: t({
                en: "Your file and progress were kept.",
                es: "Tu archivo y tu progreso se guardaron.",
                fr: "Votre fichier et votre progression ont été conservés.",
                pt: "Seu arquivo e seu progresso foram guardados.",
            }),
            matchRule: t({
                en: "Same day, amount and currency count as a match.",
                es: "Mismo día, monto y moneda cuentan como coincidencia.",
                fr: "Même jour, montant et devise comptent comme une correspondance.",
                pt: "Mesmo dia, valor e moeda contam como coincidência.",
            }),
            matchesBalance: insert(
                t({
                    en: "Matches your {{account}} balance to the cent.",
                    es: "Coincide con tu saldo de {{account}} al centavo.",
                    fr: "Correspond au centime près à votre solde {{account}}.",
                    pt: "Confere com seu saldo de {{account}} até o centavo.",
                })
            ),
            new: t({ en: "New", es: "Nuevos", fr: "Nouveaux", pt: "Novos" }),
            newEntries: insert(
                t({
                    en: "{{count}} new entries",
                    es: "{{count}} movimientos nuevos",
                    fr: "{{count}} nouvelles opérations",
                    pt: "{{count}} lançamentos novos",
                })
            ),
            next: t({ en: "Next page", es: "Página siguiente", fr: "Page suivante", pt: "Próxima página" }),
            nothingImported: t({
                en: "Nothing was imported.",
                es: "No se importó nada.",
                fr: "Rien n'a été importé.",
                pt: "Nada foi importado.",
            }),
            nothingImportedHint: t({
                en: "The write failed, so your ledger is unchanged. Your selections are still here.",
                es: "La escritura falló, así que tu registro no cambió. Tus selecciones siguen aquí.",
                fr: "L'écriture a échoué, votre registre est donc inchangé. Vos sélections sont toujours là.",
                pt: "A gravação falhou, então seu registro não mudou. Suas seleções continuam aqui.",
            }),
            nothingSelected: t({
                en: "Pick at least one row to import.",
                es: "Elige al menos una fila para importar.",
                fr: "Choisissez au moins une ligne à importer.",
                pt: "Escolha pelo menos uma linha para importar.",
            }),
            nowIn: t({
                en: "Now in Outlayr",
                es: "Ahora en Outlayr",
                fr: "Maintenant dans Outlayr",
                pt: "Agora no Outlayr",
            }),
            offBalance: insert(
                t({
                    en: "{{amount}} off your {{account}} balance after this import.",
                    es: "{{amount}} de diferencia con tu saldo de {{account}} después de esta importación.",
                    fr: "{{amount}} d'écart avec votre solde {{account}} après cette importation.",
                    pt: "{{amount}} de diferença com seu saldo de {{account}} depois desta importação.",
                })
            ),
            pickCategory: t({
                en: "Pick category",
                es: "Elegir categoría",
                fr: "Choisir une catégorie",
                pt: "Escolher categoria",
            }),
            pickingUp: t({
                en: "Picking up where you left off",
                es: "Retomando donde lo dejaste",
                fr: "Reprise là où vous vous étiez arrêté",
                pt: "Retomando de onde você parou",
            }),
            previous: t({ en: "Previous page", es: "Página anterior", fr: "Page précédente", pt: "Página anterior" }),
            selectAll: t({ en: "Select all", es: "Seleccionar todo", fr: "Tout sélectionner", pt: "Selecionar tudo" }),
            showing: insert(
                t({
                    en: "Showing {{shown}} of {{total}}",
                    es: "Mostrando {{shown}} de {{total}}",
                    fr: "{{shown}} sur {{total}}",
                    pt: "Mostrando {{shown}} de {{total}}",
                })
            ),
            sideBySide: t({ en: "Side by side", es: "Lado a lado", fr: "Côte à côte", pt: "Lado a lado" }),
            skip: t({ en: "Skip", es: "Omitir", fr: "Ignorer", pt: "Ignorar" }),
            skippedTotal: insert(
                t({
                    en: "Skipped {{amount}}",
                    es: "Omitido {{amount}}",
                    fr: "Ignoré {{amount}}",
                    pt: "Ignorado {{amount}}",
                })
            ),
            startOver: t({ en: "Start over", es: "Empezar de nuevo", fr: "Recommencer", pt: "Recomeçar" }),
            statementEnd: t({ en: "Statement end", es: "Saldo final", fr: "Solde final", pt: "Saldo final" }),
            statementStart: t({
                en: "Statement start",
                es: "Saldo inicial",
                fr: "Solde de départ",
                pt: "Saldo inicial",
            }),
            thisImport: t({
                en: "This import",
                es: "Esta importación",
                fr: "Cette importation",
                pt: "Esta importação",
            }),
        },
        sources: {
            csv: t({ en: "CSV file", es: "Archivo CSV", fr: "Fichier CSV", pt: "Arquivo CSV" }),
            csvHint: t({
                en: "Any bank or spreadsheet",
                es: "Cualquier banco u hoja de cálculo",
                fr: "N'importe quelle banque ou feuille de calcul",
                pt: "Qualquer banco ou planilha",
            }),
            fromApp: t({
                en: "From another app",
                es: "Desde otra app",
                fr: "Depuis une autre app",
                pt: "De outro app",
            }),
            fromFile: t({ en: "From a file", es: "Desde un archivo", fr: "Depuis un fichier", pt: "De um arquivo" }),
            moneyManager: t({ en: "Money Manager", es: "Money Manager", fr: "Money Manager", pt: "Money Manager" }),
            moneyManagerHint: t({
                en: "Orange Dog, .mmbackup",
                es: "Orange Dog, .mmbackup",
                fr: "Orange Dog, .mmbackup",
                pt: "Orange Dog, .mmbackup",
            }),
            notion: t({ en: "Notion", es: "Notion", fr: "Notion", pt: "Notion" }),
            notionConnected: insert(
                t({
                    en: "Connected to {{name}}",
                    es: "Conectado a {{name}}",
                    fr: "Connecté à {{name}}",
                    pt: "Conectado a {{name}}",
                })
            ),
            notionConnectedPlain: t({ en: "Connected", es: "Conectado", fr: "Connecté", pt: "Conectado" }),
            notionHint: t({
                en: "Markdown & CSV export",
                es: "Exportación Markdown y CSV",
                fr: "Export Markdown et CSV",
                pt: "Exportação Markdown e CSV",
            }),
            pdf: t({
                en: "Bank statement PDF",
                es: "Estado de cuenta en PDF",
                fr: "Relevé bancaire PDF",
                pt: "Extrato bancário em PDF",
            }),
            pdfHint: t({ en: "Read by AI", es: "Leído por IA", fr: "Lu par l'IA", pt: "Lido por IA" }),
        },
        status: {
            duplicate: t({ en: "Duplicate", es: "Duplicado", fr: "Doublon", pt: "Duplicado" }),
            imported: t({ en: "Imported", es: "Importado", fr: "Importé", pt: "Importado" }),
            new: t({ en: "New", es: "Nuevo", fr: "Nouveau", pt: "Novo" }),
            undone: t({ en: "Undone", es: "Deshecho", fr: "Annulé", pt: "Desfeito" }),
        },
        steps: {
            done: t({ en: "Done", es: "Listo", fr: "Terminé", pt: "Pronto" }),
            match: t({
                en: "Match columns",
                es: "Asignar columnas",
                fr: "Associer les colonnes",
                pt: "Associar colunas",
            }),
            review: t({ en: "Review", es: "Revisar", fr: "Vérifier", pt: "Revisar" }),
            upload: t({ en: "Upload", es: "Subir", fr: "Envoi", pt: "Enviar" }),
        },
        tabs: {
            history: t({ en: "History", es: "Historial", fr: "Historique", pt: "Histórico" }),
            newImport: t({
                en: "New import",
                es: "Nueva importación",
                fr: "Nouvelle importation",
                pt: "Nova importação",
            }),
        },
        title: t({ en: "Import", es: "Importar", fr: "Importer", pt: "Importar" }),
        tryAgain: t({ en: "Try again", es: "Intentar de nuevo", fr: "Réessayer", pt: "Tentar de novo" }),
        undo: t({ en: "Undo", es: "Deshacer", fr: "Annuler", pt: "Desfazer" }),
        undoDialog: {
            balanceAfter: insert(
                t({
                    en: "{{account}} balance after",
                    es: "Saldo de {{account}} después",
                    fr: "Solde {{account}} après",
                    pt: "Saldo de {{account}} depois",
                })
            ),
            confirm: t({ en: "Undo", es: "Deshacer", fr: "Annuler l'import", pt: "Desfazer" }),
            entriesRemoved: t({
                en: "Entries removed",
                es: "Movimientos que se quitan",
                fr: "Opérations retirées",
                pt: "Lançamentos removidos",
            }),
            title: t({
                en: "Undo the import?",
                es: "¿Deshacer la importación?",
                fr: "Annuler l'importation ?",
                pt: "Desfazer a importação?",
            }),
        },
        upload: {
            aiOff: t({
                en: "AI is turned off",
                es: "La IA está desactivada",
                fr: "L'IA est désactivée",
                pt: "A IA está desativada",
            }),
            aiOffHint: t({
                en: "Reading a statement needs AI. Turn on Settings, Send data to AI providers, or import a CSV instead.",
                es: "Leer un estado de cuenta necesita IA. Activa Ajustes, Enviar datos a proveedores de IA, o importa un CSV.",
                fr: "Lire un relevé nécessite l'IA. Activez Réglages, Envoyer les données aux fournisseurs d'IA, ou importez un CSV.",
                pt: "Ler um extrato precisa de IA. Ative Ajustes, Enviar dados a provedores de IA, ou importe um CSV.",
            }),
            cantReadPdf: t({
                en: "We couldn't read this statement",
                es: "No pudimos leer este estado de cuenta",
                fr: "Nous n'avons pas pu lire ce relevé",
                pt: "Não conseguimos ler este extrato",
            }),
            cantReadPdfHint: t({
                en: "It may be a scan or password protected. Ask your bank for a CSV or a PDF with selectable text.",
                es: "Puede ser un escaneo o tener contraseña. Pide a tu banco un CSV o un PDF con texto seleccionable.",
                fr: "C'est peut-être un scan ou il est protégé par un mot de passe. Demandez à votre banque un CSV ou un PDF avec du texte sélectionnable.",
                pt: "Pode ser uma digitalização ou ter senha. Peça ao seu banco um CSV ou um PDF com texto selecionável.",
            }),
            chooseCsv: t({ en: "Choose CSV", es: "Elegir CSV", fr: "Choisir un CSV", pt: "Escolher CSV" }),
            choosePdf: t({ en: "Choose PDF", es: "Elegir PDF", fr: "Choisir un PDF", pt: "Escolher PDF" }),
            columns: t({ en: "Columns", es: "Columnas", fr: "Colonnes", pt: "Colunas" }),
            columnsNeed: t({ en: "At least 3", es: "Al menos 3", fr: "Au moins 3", pt: "Pelo menos 3" }),
            csvCard: t({ en: "CSV file", es: "Archivo CSV", fr: "Fichier CSV", pt: "Arquivo CSV" }),
            csvLimit: t({
                en: "CSV up to 10 MB",
                es: "CSV de hasta 10 MB",
                fr: "CSV jusqu'à 10 Mo",
                pt: "CSV de até 10 MB",
            }),
            csvNeeds: t({ en: "A CSV needs", es: "Un CSV necesita", fr: "Un CSV doit avoir", pt: "Um CSV precisa de" }),
            dates: t({ en: "Dates", es: "Fechas", fr: "Dates", pt: "Datas" }),
            dropCsv: t({
                en: "Drop your CSV here",
                es: "Suelta tu CSV aquí",
                fr: "Déposez votre CSV ici",
                pt: "Solte seu CSV aqui",
            }),
            dropCsvHint: t({
                en: "Large files are read on your device only.",
                es: "Los archivos grandes se leen solo en tu dispositivo.",
                fr: "Les gros fichiers sont lus uniquement sur votre appareil.",
                pt: "Arquivos grandes são lidos só no seu dispositivo.",
            }),
            dropPdf: t({
                en: "Drop your statement here",
                es: "Suelta tu estado de cuenta aquí",
                fr: "Déposez votre relevé ici",
                pt: "Solte seu extrato aqui",
            }),
            dropPdfHint: t({
                en: "A PDF with selectable text works best. Scans can't be read.",
                es: "Funciona mejor un PDF con texto seleccionable. Los escaneos no se pueden leer.",
                fr: "Un PDF avec du texte sélectionnable fonctionne mieux. Les scans ne sont pas lisibles.",
                pt: "Um PDF com texto selecionável funciona melhor. Digitalizações não podem ser lidas.",
            }),
            dropToRead: t({
                en: "Drop to read it",
                es: "Suelta para leerlo",
                fr: "Déposez pour le lire",
                pt: "Solte para ler",
            }),
            file: t({ en: "File", es: "Archivo", fr: "Fichier", pt: "Arquivo" }),
            importCsvInstead: t({
                en: "Import a CSV instead",
                es: "Importar un CSV",
                fr: "Importer un CSV à la place",
                pt: "Importar um CSV",
            }),
            needsNote: t({
                en: "Outlayr needs at least a date, an amount, and a category or description column.",
                es: "Outlayr necesita al menos una fecha, un monto y una columna de categoría o descripción.",
                fr: "Outlayr a besoin au moins d'une date, d'un montant et d'une colonne de catégorie ou de description.",
                pt: "O Outlayr precisa de pelo menos uma data, um valor e uma coluna de categoria ou descrição.",
            }),
            noFile: t({
                en: "No file chosen",
                es: "Ningún archivo elegido",
                fr: "Aucun fichier choisi",
                pt: "Nenhum arquivo escolhido",
            }),
            notCsv: t({
                en: "This doesn't look like a CSV file",
                es: "Esto no parece un archivo CSV",
                fr: "Ceci ne ressemble pas à un fichier CSV",
                pt: "Isto não parece um arquivo CSV",
            }),
            notCsvHint: t({
                en: "We couldn't find any comma-separated data in this file.",
                es: "No encontramos datos separados por comas en este archivo.",
                fr: "Nous n'avons trouvé aucune donnée séparée par des virgules dans ce fichier.",
                pt: "Não encontramos dados separados por vírgula neste arquivo.",
            }),
            notPdf: t({
                en: "This doesn't look like a PDF",
                es: "Esto no parece un PDF",
                fr: "Ceci ne ressemble pas à un PDF",
                pt: "Isto não parece um PDF",
            }),
            notPdfHint: t({
                en: "Pick the statement your bank lets you download as a PDF.",
                es: "Elige el estado de cuenta que tu banco permite descargar en PDF.",
                fr: "Choisissez le relevé que votre banque permet de télécharger en PDF.",
                pt: "Escolha o extrato que seu banco deixa baixar em PDF.",
            }),
            notRead: insert(
                t({
                    en: "Not read, {{size}}",
                    es: "No se leyó, {{size}}",
                    fr: "Non lu, {{size}}",
                    pt: "Não lido, {{size}}",
                })
            ),
            notReadDeleted: t({
                en: "Not read, the file was deleted",
                es: "No se leyó, el archivo se borró",
                fr: "Non lu, le fichier a été supprimé",
                pt: "Não lido, o arquivo foi apagado",
            }),
            notReadYet: insert(
                t({
                    en: "Not read yet, {{size}}",
                    es: "Aún no se lee, {{size}}",
                    fr: "Pas encore lu, {{size}}",
                    pt: "Ainda não lido, {{size}}",
                })
            ),
            otherErrors: t({
                en: "Other file errors",
                es: "Otros errores de archivo",
                fr: "Autres erreurs de fichier",
                pt: "Outros erros de arquivo",
            }),
            pdfCard: t({
                en: "Bank statement PDF",
                es: "Estado de cuenta en PDF",
                fr: "Relevé bancaire PDF",
                pt: "Extrato bancário em PDF",
            }),
            pdfLimit: t({
                en: "PDF up to 10 MB",
                es: "PDF de hasta 10 MB",
                fr: "PDF jusqu'à 10 Mo",
                pt: "PDF de até 10 MB",
            }),
            privacyPdf: t({
                en: "The file goes to our server, which deletes it after reading it. Its text goes to Anthropic with long account and card numbers masked, including your name and address if printed.",
                es: "El archivo va a nuestro servidor, que lo borra después de leerlo. Su texto va a Anthropic con los números largos de cuentas y tarjetas ocultos, incluidos tu nombre y dirección si aparecen.",
                fr: "Le fichier est envoyé à notre serveur, qui le supprime après lecture. Son texte est envoyé à Anthropic avec les longs numéros de compte et de carte masqués, y compris votre nom et votre adresse s'ils y figurent.",
                pt: "O arquivo vai para nosso servidor, que o apaga depois de ler. O texto vai para a Anthropic com números longos de conta e cartão ocultos, incluindo seu nome e endereço se aparecerem.",
            }),
            problem: {
                cantOpen: t({ en: "Can't open", es: "No se puede abrir", fr: "Impossible d'ouvrir", pt: "Não abre" }),
                cantOpenHint: t({
                    en: "We couldn't read that file.",
                    es: "No pudimos leer ese archivo.",
                    fr: "Nous n'avons pas pu lire ce fichier.",
                    pt: "Não conseguimos ler esse arquivo.",
                }),
                fewColumns: t({ en: "Few columns", es: "Pocas columnas", fr: "Peu de colonnes", pt: "Poucas colunas" }),
                fewColumnsHint: t({
                    en: "Fewer than 3 columns.",
                    es: "Menos de 3 columnas.",
                    fr: "Moins de 3 colonnes.",
                    pt: "Menos de 3 colunas.",
                }),
                fewColumnsTitle: t({
                    en: "This file has too few columns",
                    es: "Este archivo tiene muy pocas columnas",
                    fr: "Ce fichier a trop peu de colonnes",
                    pt: "Este arquivo tem poucas colunas",
                }),
                noRows: t({ en: "No rows", es: "Sin filas", fr: "Aucune ligne", pt: "Sem linhas" }),
                noRowsHint: t({
                    en: "A header row but no data.",
                    es: "Un encabezado pero sin datos.",
                    fr: "Un en-tête mais aucune donnée.",
                    pt: "Um cabeçalho, mas sem dados.",
                }),
                noRowsTitle: t({
                    en: "This file has no rows",
                    es: "Este archivo no tiene filas",
                    fr: "Ce fichier n'a aucune ligne",
                    pt: "Este arquivo não tem linhas",
                }),
                offline: t({ en: "Offline", es: "Sin conexión", fr: "Hors ligne", pt: "Offline" }),
                offlineHint: t({
                    en: "Reading a statement needs a connection.",
                    es: "Leer un estado de cuenta necesita conexión.",
                    fr: "Lire un relevé nécessite une connexion.",
                    pt: "Ler um extrato precisa de conexão.",
                }),
                overLimit: t({
                    en: "Over limit",
                    es: "Límite alcanzado",
                    fr: "Limite atteinte",
                    pt: "Limite atingido",
                }),
                overLimitHint: t({
                    en: "This month's imports are used.",
                    es: "Ya usaste las importaciones de este mes.",
                    fr: "Les importations de ce mois sont épuisées.",
                    pt: "As importações deste mês acabaram.",
                }),
                overLimitText: t({
                    en: "They come back next month. A CSV import has no limit.",
                    es: "Vuelven el próximo mes. Importar un CSV no tiene límite.",
                    fr: "Elles reviennent le mois prochain. L'import CSV n'a pas de limite.",
                    pt: "Elas voltam no próximo mês. Importar CSV não tem limite.",
                }),
                overLimitTitle: t({
                    en: "This month's statement reads are used",
                    es: "Ya usaste las lecturas de estados de cuenta de este mes",
                    fr: "Les lectures de relevés de ce mois sont épuisées",
                    pt: "As leituras de extrato deste mês acabaram",
                }),
                serviceText: t({
                    en: "Nothing was kept. Try again in a moment, or import a CSV instead.",
                    es: "No se guardó nada. Intenta de nuevo en un momento, o importa un CSV.",
                    fr: "Rien n'a été conservé. Réessayez dans un instant, ou importez un CSV.",
                    pt: "Nada foi guardado. Tente de novo em instantes, ou importe um CSV.",
                }),
                serviceTitle: t({
                    en: "The statement reader didn't answer",
                    es: "El lector de estados de cuenta no respondió",
                    fr: "Le lecteur de relevés n'a pas répondu",
                    pt: "O leitor de extratos não respondeu",
                }),
                tooLarge: t({ en: "Too large", es: "Muy grande", fr: "Trop volumineux", pt: "Grande demais" }),
                tooLargeHint: t({
                    en: "Export a smaller date range.",
                    es: "Exporta un rango de fechas más corto.",
                    fr: "Exportez une période plus courte.",
                    pt: "Exporte um período menor.",
                }),
                tooLargeTitle: t({
                    en: "This file is over 10 MB",
                    es: "Este archivo pesa más de 10 MB",
                    fr: "Ce fichier dépasse 10 Mo",
                    pt: "Este arquivo passa de 10 MB",
                }),
            },
            readByAi: insert(
                t({
                    en: "Read by AI in {{seconds}} s",
                    es: "Leído por IA en {{seconds}} s",
                    fr: "Lu par l'IA en {{seconds}} s",
                    pt: "Lido por IA em {{seconds}} s",
                })
            ),
            readOnDevice: t({
                en: "Read on this device",
                es: "Leído en este dispositivo",
                fr: "Lu sur cet appareil",
                pt: "Lido neste dispositivo",
            }),
            reading: t({
                en: "Reading statement…",
                es: "Leyendo estado de cuenta…",
                fr: "Lecture du relevé…",
                pt: "Lendo extrato…",
            }),
            readingNote: t({
                en: "This takes up to a minute. You can keep this tab in the background.",
                es: "Esto tarda hasta un minuto. Puedes dejar esta pestaña en segundo plano.",
                fr: "Cela prend jusqu'à une minute. Vous pouvez laisser cet onglet en arrière-plan.",
                pt: "Isso leva até um minuto. Você pode deixar esta aba em segundo plano.",
            }),
            rows: t({ en: "Rows", es: "Filas", fr: "Lignes", pt: "Linhas" }),
            rowsNeed: t({
                en: "A header, then data",
                es: "Un encabezado y luego datos",
                fr: "Un en-tête, puis des données",
                pt: "Um cabeçalho, depois dados",
            }),
            size: t({ en: "Size", es: "Tamaño", fr: "Taille", pt: "Tamanho" }),
            sizeNeed: t({ en: "Up to 10 MB", es: "Hasta 10 MB", fr: "Jusqu'à 10 Mo", pt: "Até 10 MB" }),
            turnOn: t({ en: "Turn on and read", es: "Activar y leer", fr: "Activer et lire", pt: "Ativar e ler" }),
            uploading: t({
                en: "Sending statement…",
                es: "Enviando estado de cuenta…",
                fr: "Envoi du relevé…",
                pt: "Enviando extrato…",
            }),
            worksWith: t({ en: "Works with", es: "Funciona con", fr: "Compatible avec", pt: "Funciona com" }),
            worksWithNote: t({
                en: "CSV files are read on this device. A PDF statement's text goes to our AI provider.",
                es: "Los CSV se leen en este dispositivo. El texto de un estado de cuenta en PDF va a nuestro proveedor de IA.",
                fr: "Les fichiers CSV sont lus sur cet appareil. Le texte d'un relevé PDF est envoyé à notre fournisseur d'IA.",
                pt: "Arquivos CSV são lidos neste dispositivo. O texto de um extrato em PDF vai para nosso provedor de IA.",
            }),
        },
    },
    key: "dashboard-import",
} satisfies Dictionary;

export default dashboardImport;
