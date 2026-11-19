import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardSync = {
    content: {
        syncNow: t({
            en: "Sync now",
            de: "Jetzt synchronisieren",
            es: "Sincronizar ahora",
            fr: "Synchroniser",
            pt: "Sincronizar agora",
        }),
        retry: t({ en: "Retry", de: "Erneut versuchen", es: "Reintentar", fr: "Réessayer", pt: "Tentar de novo" }),
        status: t({ en: "Status", de: "Status", es: "Estado", fr: "État", pt: "Status" }),
        upToDate: t({ en: "Up to date", de: "Aktuell", es: "Al día", fr: "À jour", pt: "Em dia" }),
        on: t({ en: "On", de: "An", es: "Activa", fr: "Activée", pt: "Ativa" }),
        syncing: t({
            en: "Syncing",
            de: "Wird synchronisiert",
            es: "Sincronizando",
            fr: "Synchronisation",
            pt: "Sincronizando",
        }),
        inProgress: t({ en: "In progress", de: "Läuft", es: "En curso", fr: "En cours", pt: "Em andamento" }),
        notSyncing: t({
            en: "Not syncing",
            de: "Keine Synchronisierung",
            es: "Sin sincronizar",
            fr: "Non synchronisé",
            pt: "Sem sincronizar",
        }),
        failed: t({ en: "Failed", de: "Fehlgeschlagen", es: "Falló", fr: "Échec", pt: "Falhou" }),
        waiting: t({
            en: "Waiting to sync",
            de: "Wartet auf Synchronisierung",
            es: "Por sincronizar",
            fr: "En attente",
            pt: "Aguardando",
        }),
        changes: t({ en: "changes", de: "Änderungen", es: "cambios", fr: "modifications", pt: "alterações" }),
        ofChanges: insert(
            t({
                en: "of {{count}} changes",
                de: "von {{count}} Änderungen",
                es: "de {{count}} cambios",
                fr: "sur {{count}} modifications",
                pt: "de {{count}} alterações",
            })
        ),
        lastSynced: t({
            en: "Last synced",
            de: "Zuletzt synchronisiert",
            es: "Última sincronización",
            fr: "Dernière synchro",
            pt: "Última sincronização",
        }),
        notYet: t({ en: "Not yet", de: "Noch nicht", es: "Aún no", fr: "Pas encore", pt: "Ainda não" }),
        thisSession: t({
            en: "in this session",
            de: "in dieser Sitzung",
            es: "en esta sesión",
            fr: "dans cette session",
            pt: "nesta sessão",
        }),
        inLedger: t({
            en: "In this ledger",
            de: "In diesem Haushaltsbuch",
            es: "En estas finanzas",
            fr: "Dans ces comptes",
            pt: "Nestas finanças",
        }),
        transactions: t({ en: "transactions", de: "Einträge", es: "movimientos", fr: "opérations", pt: "lançamentos" }),
        unreachable: t({
            en: "Couldn't reach Outlayr",
            de: "Outlayr nicht erreichbar",
            es: "No se pudo conectar con Outlayr",
            fr: "Impossible de joindre Outlayr",
            pt: "Não foi possível acessar o Outlayr",
        }),
        completeHere: t({
            en: "Your ledger is complete here",
            de: "Dein Haushaltsbuch ist hier vollständig",
            es: "Tus finanzas están completas aquí",
            fr: "Vos comptes sont complets ici",
            pt: "Suas finanças estão completas aqui",
        }),
        replication: t({ en: "Replication", de: "Replikation", es: "Réplica", fr: "Réplication", pt: "Réplica" }),
        progress: insert(
            t({
                en: "{{done}} of {{total}}",
                de: "{{done}} von {{total}}",
                es: "{{done}} de {{total}}",
                fr: "{{done}} sur {{total}}",
                pt: "{{done}} de {{total}}",
            })
        ),
        account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
        sent: t({
            en: "Nothing left to send",
            de: "Nichts mehr zu senden",
            es: "Nada pendiente de enviar",
            fr: "Rien à envoyer",
            pt: "Nada a enviar",
        }),
        synced: {
            title: t({
                en: "What syncs",
                de: "Was synchronisiert wird",
                es: "Qué se sincroniza",
                fr: "Ce qui est synchronisé",
                pt: "O que sincroniza",
            }),
            entries: {
                label: t({ en: "Entries", de: "Einträge", es: "Movimientos", fr: "Opérations", pt: "Lançamentos" }),
                hint: t({
                    en: "Amount, currency, date, merchant, note (imported bank descriptions included), category, account, payment method, fees, tags, splits, receipt details, exchange rate, repeat schedule, and whether it's waiting for review",
                    de: "Betrag, Währung, Datum, Händler, Notiz (auch importierte Bankbeschreibungen), Kategorie, Konto, Zahlungsart, Gebühren, Tags, Aufteilungen, Belegdetails, Wechselkurs, Wiederholung und ob er auf Prüfung wartet",
                    es: "Monto, moneda, fecha, comercio, nota (incluidas las descripciones bancarias importadas), categoría, cuenta, método de pago, comisiones, etiquetas, divisiones, detalles del recibo, tasa de cambio, repetición y si está por revisar",
                    fr: "Montant, devise, date, commerçant, note (descriptions bancaires importées comprises), catégorie, compte, moyen de paiement, frais, tags, répartitions, détails du reçu, taux de change, répétition et si elle attend une vérification",
                    pt: "Valor, moeda, data, estabelecimento, nota (incluindo descrições bancárias importadas), categoria, conta, forma de pagamento, tarifas, tags, divisões, detalhes do recibo, câmbio, repetição e se aguarda revisão",
                }),
            },
            transfers: {
                label: t({
                    en: "Transfers",
                    de: "Umbuchungen",
                    es: "Transferencias",
                    fr: "Virements",
                    pt: "Transferências",
                }),
                hint: t({
                    en: "Both accounts, amounts, currencies, exchange rate, date and note",
                    de: "Beide Konten, Beträge, Währungen, Wechselkurs, Datum und Notiz",
                    es: "Ambas cuentas, montos, monedas, tasa de cambio, fecha y nota",
                    fr: "Les deux comptes, montants, devises, taux de change, date et note",
                    pt: "As duas contas, valores, moedas, câmbio, data e nota",
                }),
            },
            accounts: {
                label: t({ en: "Accounts", de: "Konten", es: "Cuentas", fr: "Comptes", pt: "Contas" }),
                hint: t({
                    en: "Name (including people you track debts with), type, currency, opening balance and its date, credit limit, statement and payment days, last balance check, and whether it's archived",
                    de: "Name (auch Personen, mit denen du Schulden verfolgst), Art, Währung, Anfangssaldo und sein Datum, Kreditlimit, Abrechnungs- und Zahltag, letzte Saldoprüfung und ob es archiviert ist",
                    es: "Nombre (incluidas las personas con las que llevas deudas), tipo, moneda, saldo inicial y su fecha, límite de crédito, días de corte y de pago, última revisión del saldo y si está archivada",
                    fr: "Nom (y compris les personnes avec qui vous suivez des dettes), type, devise, solde initial et sa date, plafond, jours de relevé et de paiement, dernière vérification du solde et si le compte est archivé",
                    pt: "Nome (incluindo pessoas com quem você acompanha dívidas), tipo, moeda, saldo inicial e sua data, limite de crédito, dias de fechamento e de pagamento, última conferência do saldo e se está arquivada",
                }),
            },
            adjustments: {
                label: t({
                    en: "Adjustments and outside money",
                    de: "Korrekturen und Geld außerhalb",
                    es: "Ajustes y dinero por fuera",
                    fr: "Ajustements et argent hors comptes",
                    pt: "Ajustes e dinheiro por fora",
                }),
                hint: t({
                    en: "Balance adjustments and money moved outside your tracked accounts: the account or person, amount, date and note",
                    de: "Saldokorrekturen und Geld außerhalb deiner Konten: Konto oder Person, Betrag, Datum und Notiz",
                    es: "Ajustes de saldo y dinero movido fuera de tus cuentas: la cuenta o persona, monto, fecha y nota",
                    fr: "Ajustements de solde et argent déplacé hors de vos comptes : le compte ou la personne, montant, date et note",
                    pt: "Ajustes de saldo e dinheiro movido fora das suas contas: a conta ou pessoa, valor, data e nota",
                }),
            },
            categories: {
                label: t({
                    en: "Categories and tags",
                    de: "Kategorien und Tags",
                    es: "Categorías y etiquetas",
                    fr: "Catégories et tags",
                    pt: "Categorias e tags",
                }),
                hint: t({
                    en: "Names, colors, icons and order",
                    de: "Namen, Farben, Symbole und Reihenfolge",
                    es: "Nombres, colores, íconos y orden",
                    fr: "Noms, couleurs, icônes et ordre",
                    pt: "Nomes, cores, ícones e ordem",
                }),
            },
            budgets: {
                label: t({ en: "Budgets", de: "Budgets", es: "Presupuestos", fr: "Budgets", pt: "Orçamentos" }),
                hint: t({
                    en: "Overall spending limit, its cadence and rollover, budgeted categories and their monthly amounts",
                    de: "Gesamtlimit, sein Rhythmus und Übertrag, budgetierte Kategorien und ihre Monatsbeträge",
                    es: "Límite general de gasto, su frecuencia y arrastre, categorías presupuestadas y sus montos mensuales",
                    fr: "Plafond global, sa fréquence et son report, catégories budgétées et leurs montants mensuels",
                    pt: "Limite geral de gastos, sua frequência e acúmulo, categorias orçadas e seus valores mensais",
                }),
            },
            goals: {
                label: t({ en: "Goals", de: "Ziele", es: "Metas", fr: "Objectifs", pt: "Metas" }),
                hint: t({
                    en: "Savings and debt payoff goals: name, linked account, targets, starting amounts and dates",
                    de: "Spar- und Tilgungsziele: Name, verknüpftes Konto, Zielbeträge, Startbeträge und Daten",
                    es: "Metas de ahorro y de pago de deudas: nombre, cuenta vinculada, objetivos, montos iniciales y fechas",
                    fr: "Objectifs d'épargne et de remboursement : nom, compte lié, cibles, montants de départ et dates",
                    pt: "Metas de poupança e de quitação de dívidas: nome, conta vinculada, alvos, valores iniciais e datas",
                }),
            },
            installments: {
                label: t({ en: "Installments", de: "Raten", es: "Cuotas", fr: "Échéances", pt: "Parcelas" }),
                hint: t({
                    en: "Plans, their payments and payments made outside Outlayr",
                    de: "Pläne, ihre Zahlungen und Zahlungen außerhalb von Outlayr",
                    es: "Planes, sus pagos y los pagos hechos fuera de Outlayr",
                    fr: "Plans, leurs paiements et les paiements faits hors d'Outlayr",
                    pt: "Planos, seus pagamentos e pagamentos feitos fora do Outlayr",
                }),
            },
            rules: {
                label: t({ en: "Rules", de: "Regeln", es: "Reglas", fr: "Règles", pt: "Regras" }),
                hint: t({
                    en: "Rules you create on the web: the merchant, description or amount they look for, and the category and tags they set",
                    de: "Regeln, die du im Web erstellst: Händler, Beschreibung oder Betrag, nach dem sie suchen, und die Kategorie und Tags, die sie setzen",
                    es: "Reglas que creas en la web: el comercio, la descripción o el monto que buscan, y la categoría y etiquetas que asignan",
                    fr: "Règles créées sur le web : le commerçant, la description ou le montant recherchés, et la catégorie et les tags appliqués",
                    pt: "Regras criadas na web: o estabelecimento, a descrição ou o valor que procuram, e a categoria e tags que aplicam",
                }),
            },
            recurring: {
                label: t({
                    en: "Recurring",
                    de: "Wiederkehrend",
                    es: "Recurrentes",
                    fr: "Récurrents",
                    pt: "Recorrentes",
                }),
                hint: t({
                    en: "Charges you pause on the web, with the entry's details and pause dates, and suggestions you dismiss",
                    de: "Zahlungen, die du im Web pausierst, mit den Details des Eintrags und den Pausendaten, und abgelehnte Vorschläge",
                    es: "Cobros que pausas en la web, con los detalles del movimiento y las fechas de pausa, y las sugerencias que descartas",
                    fr: "Prélèvements mis en pause sur le web, avec les détails de l'opération et les dates de pause, et les suggestions écartées",
                    pt: "Cobranças pausadas na web, com os detalhes do lançamento e as datas da pausa, e as sugestões descartadas",
                }),
            },
            photos: {
                label: t({
                    en: "Photos and files",
                    de: "Fotos und Dateien",
                    es: "Fotos y archivos",
                    fr: "Photos et fichiers",
                    pt: "Fotos e arquivos",
                }),
                hint: t({
                    en: "Files you attach to entries and images you set on accounts, with their names, uploaded to our file storage. A merchant logo syncs as a link to a shared logo",
                    de: "Dateien an Einträgen und Bilder von Konten, mit ihren Namen, in unseren Dateispeicher hochgeladen. Ein Händlerlogo wird als Verweis auf ein gemeinsames Logo synchronisiert",
                    es: "Archivos que adjuntas a movimientos e imágenes de cuentas, con sus nombres, subidos a nuestro almacenamiento. El logo de un comercio se sincroniza como un enlace a un logo compartido",
                    fr: "Fichiers joints aux opérations et images des comptes, avec leurs noms, envoyés dans notre stockage. Le logo d'un commerçant est synchronisé comme un lien vers un logo partagé",
                    pt: "Arquivos anexados a lançamentos e imagens das contas, com seus nomes, enviados ao nosso armazenamento. O logo de um estabelecimento sincroniza como um link para um logo compartilhado",
                }),
            },
            settings: {
                label: t({ en: "Settings", de: "Einstellungen", es: "Ajustes", fr: "Réglages", pt: "Ajustes" }),
                hint: t({
                    en: "Currency, first day of the month and week, time zone, how numbers, times and charts show, income tracking, haptics, whether Smart fill, suggestions and web lookups are on, and favorite currencies chosen on the web",
                    de: "Währung, erster Tag des Monats und der Woche, Zeitzone, Anzeige von Zahlen, Uhrzeiten und Diagrammen, Einnahmen, Haptik, ob intelligentes Ausfüllen, Vorschläge und Websuche an sind, und im Web gewählte Lieblingswährungen",
                    es: "Moneda, primer día del mes y de la semana, zona horaria, cómo se ven números, horas y gráficos, registro de ingresos, vibración, si el autocompletado inteligente, las sugerencias y las búsquedas web están activos, y las monedas favoritas elegidas en la web",
                    fr: "Devise, premier jour du mois et de la semaine, fuseau horaire, affichage des nombres, heures et graphiques, suivi des revenus, vibrations, si le remplissage intelligent, les suggestions et les recherches web sont activés, et les devises favorites choisies sur le web",
                    pt: "Moeda, primeiro dia do mês e da semana, fuso horário, como números, horários e gráficos aparecem, registro de receitas, vibração, se o preenchimento inteligente, as sugestões e as buscas na web estão ativos, e as moedas favoritas escolhidas na web",
                }),
            },
            records: {
                label: t({
                    en: "Sync records",
                    de: "Synchronisierungsdaten",
                    es: "Datos de sincronización",
                    fr: "Données de synchronisation",
                    pt: "Dados de sincronização",
                }),
                hint: t({
                    en: "A random ID for each phone and browser, each record's ID, and when it was edited, deleted or restored. A deleted record keeps its last contents",
                    de: "Eine zufällige ID pro Telefon und Browser, die ID jedes Datensatzes und wann er bearbeitet, gelöscht oder wiederhergestellt wurde. Ein gelöschter Datensatz behält seinen letzten Inhalt",
                    es: "Un ID aleatorio por teléfono y navegador, el ID de cada registro y cuándo se editó, borró o restauró. Un registro borrado conserva su último contenido",
                    fr: "Un ID aléatoire par téléphone et navigateur, l'ID de chaque enregistrement et quand il a été modifié, supprimé ou restauré. Un enregistrement supprimé garde son dernier contenu",
                    pt: "Um ID aleatório por celular e navegador, o ID de cada registro e quando foi editado, apagado ou restaurado. Um registro apagado mantém seu último conteúdo",
                }),
            },
        },
        local: {
            title: t({
                en: "Stays on each phone",
                de: "Bleibt auf jedem Telefon",
                es: "Se queda en cada teléfono",
                fr: "Reste sur chaque téléphone",
                pt: "Fica em cada celular",
            }),
            footer: t({
                en: "Sync never sends these. An entry logged from a notification syncs like any other entry.",
                de: "Die Synchronisierung sendet diese nie. Ein aus einer Mitteilung erfasster Eintrag wird wie jeder andere synchronisiert.",
                es: "La sincronización nunca envía esto. Un movimiento registrado desde una notificación se sincroniza como cualquier otro.",
                fr: "La synchronisation n'envoie jamais ces éléments. Une opération saisie depuis une notification est synchronisée comme les autres.",
                pt: "A sincronização nunca envia isso. Um lançamento registrado a partir de uma notificação sincroniza como qualquer outro.",
            }),
            lock: {
                label: t({
                    en: "App lock and hidden amounts",
                    de: "App-Sperre und ausgeblendete Beträge",
                    es: "Bloqueo de la app y montos ocultos",
                    fr: "Verrouillage et montants masqués",
                    pt: "Bloqueio do app e valores ocultos",
                }),
            },
            notifications: {
                label: t({
                    en: "Notification and reminder settings",
                    de: "Einstellungen für Mitteilungen und Erinnerungen",
                    es: "Ajustes de notificaciones y recordatorios",
                    fr: "Réglages des notifications et rappels",
                    pt: "Ajustes de notificações e lembretes",
                }),
            },
            consent: {
                label: t({
                    en: "Your Share analytics and AI permission choices",
                    de: "Deine Auswahl zu Analysedaten und KI-Erlaubnis",
                    es: "Tus preferencias de analíticas y permiso de IA",
                    fr: "Vos choix de partage des statistiques et d'autorisation IA",
                    pt: "Suas escolhas de análises e permissão de IA",
                }),
            },
            look: {
                label: t({
                    en: "Light or dark mode, number entry and favorite currencies",
                    de: "Hell- oder Dunkelmodus, Zahleneingabe und Lieblingswährungen",
                    es: "Modo claro u oscuro, forma de ingresar montos y monedas favoritas",
                    fr: "Mode clair ou sombre, saisie des montants et devises favorites",
                    pt: "Modo claro ou escuro, entrada de valores e moedas favoritas",
                }),
            },
            reading: {
                label: t({
                    en: "Which apps, senders and wallet cards it reads",
                    de: "Welche Apps, Absender und Wallet-Karten es liest",
                    es: "Qué apps, remitentes y tarjetas de la billetera lee",
                    fr: "Les apps, expéditeurs et cartes du portefeuille qu'il lit",
                    pt: "Quais apps, remetentes e cartões da carteira ele lê",
                }),
            },
        },
    },
    key: "dashboard-sync",
} satisfies Dictionary;

export default dashboardSync;
