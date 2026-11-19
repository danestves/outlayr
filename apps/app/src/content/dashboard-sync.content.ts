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
                    en: "Amount, currency, date, merchant, note, category, account, payment method, tags, splits, receipt items, exchange rate, repeat schedule, and whether it's waiting for review",
                    de: "Betrag, Währung, Datum, Händler, Notiz, Kategorie, Konto, Zahlungsart, Tags, Aufteilungen, Belegposten, Wechselkurs, Wiederholung und ob er auf Prüfung wartet",
                    es: "Monto, moneda, fecha, comercio, nota, categoría, cuenta, método de pago, etiquetas, divisiones, artículos del recibo, tasa de cambio, repetición y si está por revisar",
                    fr: "Montant, devise, date, commerçant, note, catégorie, compte, moyen de paiement, tags, répartitions, articles du reçu, taux de change, répétition et si elle attend une vérification",
                    pt: "Valor, moeda, data, estabelecimento, nota, categoria, conta, forma de pagamento, tags, divisões, itens do recibo, câmbio, repetição e se aguarda revisão",
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
                    en: "Name, type, currency, opening balance, credit limit, statement and payment days",
                    de: "Name, Art, Währung, Anfangssaldo, Kreditlimit, Abrechnungs- und Zahltag",
                    es: "Nombre, tipo, moneda, saldo inicial, límite de crédito, días de corte y de pago",
                    fr: "Nom, type, devise, solde initial, plafond, jours de relevé et de paiement",
                    pt: "Nome, tipo, moeda, saldo inicial, limite de crédito, dias de fechamento e de pagamento",
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
                label: t({
                    en: "Budgets and goals",
                    de: "Budgets und Sparziele",
                    es: "Presupuestos y metas",
                    fr: "Budgets et objectifs",
                    pt: "Orçamentos e metas",
                }),
                hint: t({
                    en: "Budgeted categories, monthly amounts, goal targets, starting amounts and dates",
                    de: "Budgetierte Kategorien, Monatsbeträge, Zielbeträge, Startbeträge und Daten",
                    es: "Categorías presupuestadas, montos mensuales, objetivos, montos iniciales y fechas",
                    fr: "Catégories budgétées, montants mensuels, objectifs, montants de départ et dates",
                    pt: "Categorias orçadas, valores mensais, alvos, valores iniciais e datas",
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
            photos: {
                label: t({
                    en: "Photos and files",
                    de: "Fotos und Dateien",
                    es: "Fotos y archivos",
                    fr: "Photos et fichiers",
                    pt: "Fotos e arquivos",
                }),
                hint: t({
                    en: "Photos and files on entries and account images, uploaded to our file storage",
                    de: "Fotos und Dateien an Einträgen und Kontobilder, in unseren Dateispeicher hochgeladen",
                    es: "Fotos y archivos de movimientos e imágenes de cuentas, subidos a nuestro almacenamiento",
                    fr: "Photos et fichiers des opérations et images des comptes, envoyés dans notre stockage",
                    pt: "Fotos e arquivos dos lançamentos e imagens das contas, enviados ao nosso armazenamento",
                }),
            },
            settings: {
                label: t({ en: "Settings", de: "Einstellungen", es: "Ajustes", fr: "Réglages", pt: "Ajustes" }),
                hint: t({
                    en: "Currency, display preferences, first day of the month and week, time zone, and whether Smart fill, suggestions and web lookups are on",
                    de: "Währung, Anzeige, erster Tag des Monats und der Woche, Zeitzone und ob intelligentes Ausfüllen, Vorschläge und Websuche an sind",
                    es: "Moneda, preferencias de pantalla, primer día del mes y de la semana, zona horaria y si el autocompletado inteligente, las sugerencias y las búsquedas web están activos",
                    fr: "Devise, affichage, premier jour du mois et de la semaine, fuseau horaire et si le remplissage intelligent, les suggestions et les recherches web sont activés",
                    pt: "Moeda, exibição, primeiro dia do mês e da semana, fuso horário e se o preenchimento inteligente, as sugestões e as buscas na web estão ativos",
                }),
            },
            device: {
                label: t({
                    en: "Device ID",
                    de: "Geräte-ID",
                    es: "ID del dispositivo",
                    fr: "ID de l'appareil",
                    pt: "ID do dispositivo",
                }),
                hint: t({
                    en: "A random ID for each device, used to order edits",
                    de: "Eine zufällige ID pro Gerät, um Änderungen zu ordnen",
                    es: "Un ID aleatorio por dispositivo, para ordenar los cambios",
                    fr: "Un ID aléatoire par appareil, pour ordonner les modifications",
                    pt: "Um ID aleatório por dispositivo, para ordenar as alterações",
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
                    en: "Notifications and reminders",
                    de: "Mitteilungen und Erinnerungen",
                    es: "Notificaciones y recordatorios",
                    fr: "Notifications et rappels",
                    pt: "Notificações e lembretes",
                }),
            },
            consent: {
                label: t({
                    en: "Share analytics and permission to send to AI",
                    de: "Analysedaten teilen und Erlaubnis zum Senden an KI",
                    es: "Compartir analíticas y permiso para enviar a la IA",
                    fr: "Partage des statistiques et autorisation d'envoi à l'IA",
                    pt: "Compartilhar análises e permissão para enviar à IA",
                }),
            },
            look: {
                label: t({
                    en: "Light or dark mode and number entry",
                    de: "Hell- oder Dunkelmodus und Zahleneingabe",
                    es: "Modo claro u oscuro y forma de ingresar montos",
                    fr: "Mode clair ou sombre et saisie des montants",
                    pt: "Modo claro ou escuro e entrada de valores",
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
