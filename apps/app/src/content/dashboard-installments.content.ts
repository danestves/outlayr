import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInstallments = {
    content: {
        back: t({
            en: "Back to installments",
            de: "Zurück zu den Raten",
            es: "Volver a cuotas",
            "es-ES": "Volver a plazos",
            fr: "Retour aux paiements échelonnés",
            pt: "Voltar às parcelas",
            "pt-PT": "Voltar às prestações",
        }),
        cadence: {
            days: insert(
                t({
                    en: "every {{count}} days",
                    de: "alle {{count}} Tage",
                    es: "cada {{count}} días",
                    fr: "tous les {{count}} jours",
                    pt: "a cada {{count}} dias",
                })
            ),
            monthly: t({
                en: "every month",
                de: "jeden Monat",
                es: "cada mes",
                fr: "chaque mois",
                pt: "todo mês",
                "pt-PT": "todos os meses",
            }),
            semimonthly: t({
                en: "twice a month",
                de: "zweimal im Monat",
                es: "dos veces al mes",
                fr: "deux fois par mois",
                pt: "duas vezes por mês",
            }),
            weekly: t({
                en: "every week",
                de: "jede Woche",
                es: "cada semana",
                fr: "chaque semaine",
                pt: "toda semana",
                "pt-PT": "todas as semanas",
            }),
        },
        cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        columns: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", "es-ES": "Importe", fr: "Montant", pt: "Valor" }),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            due: t({ en: "Due", de: "Fällig", es: "Vence", fr: "Échéance", pt: "Vencimento" }),
            installment: t({
                en: "Installment",
                de: "Rate",
                es: "Cuota",
                "es-ES": "Plazo",
                fr: "Échéance",
                pt: "Parcela",
                "pt-PT": "Prestação",
            }),
            leftAfter: t({
                en: "Left after",
                de: "Übrig danach",
                es: "Queda después",
                fr: "Reste après",
                pt: "Resta depois",
            }),
            leftToPay: t({
                en: "Left to pay",
                de: "Noch zu zahlen",
                es: "Por pagar",
                fr: "Reste à payer",
                pt: "Falta pagar",
            }),
            next: t({ en: "Next", de: "Nächste", es: "Próxima", fr: "Prochaine", pt: "Próxima" }),
            order: t({ en: "Order", de: "Bestellung", es: "Orden", fr: "Commande", pt: "Compra" }),
            paidFrom: t({ en: "Paid from", de: "Bezahlt von", es: "Pagada desde", fr: "Payée depuis", pt: "Paga com" }),
            paidOff: t({ en: "Paid off", de: "Abbezahlt", es: "Pagada", fr: "Soldée", pt: "Quitada" }),
            plan: t({ en: "Plan", de: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
            price: t({ en: "Price", de: "Preis", es: "Precio", fr: "Prix", pt: "Preço" }),
            progress: t({ en: "Progress", de: "Fortschritt", es: "Progreso", fr: "Progression", pt: "Progresso" }),
            status: t({ en: "Status", de: "Status", es: "Estado", fr: "Statut", pt: "Status", "pt-PT": "Estado" }),
        },
        comingUp: t({ en: "Coming up", de: "Demnächst", es: "Próximas", fr: "À venir", pt: "Próximas" }),
        consent: {
            fine: t({
                en: "It goes through our server to a third-party AI provider, which never gets your name, email, or account ID. We don't keep the screenshot.",
                de: "Es läuft über unseren Server zu einem KI-Anbieter, der weder deinen Namen noch deine E-Mail-Adresse oder Konto-ID erhält. Den Screenshot speichern wir nicht.",
                es: "Pasa por nuestro servidor hacia un proveedor de IA externo, que nunca recibe tu nombre, tu correo ni el ID de tu cuenta. No guardamos la captura.",
                fr: "Elle passe par notre serveur vers un fournisseur d'IA tiers, qui ne reçoit jamais votre nom, votre e-mail ni l'identifiant de votre compte. Nous ne conservons pas la capture.",
                pt: "Ela passa pelo nosso servidor até um provedor de IA terceiro, que nunca recebe seu nome, e-mail ou ID da conta. Não guardamos a captura.",
                "pt-PT":
                    "Ela passa pelo nosso servidor até um fornecedor de IA terceiro, que nunca recebe o seu nome, e-mail ou ID da conta. Não guardamos a captura.",
            }),
            planScan: t({
                en: "Installment plan import",
                de: "Import von Ratenplänen",
                es: "Importar un plan de cuotas",
                "es-ES": "Importar un plan de plazos",
                fr: "Import d'échéancier",
                pt: "Importar compra parcelada",
                "pt-PT": "Importar compra a prestações",
            }),
            planScanSends: t({
                en: "The screenshot, the account's name, currency, language, region, and today's date",
                de: "Der Screenshot sowie Name, Währung, Sprache und Region des Kontos und das heutige Datum",
                es: "La captura, el nombre de la cuenta, la moneda, el idioma, la región y la fecha de hoy",
                fr: "La capture d'écran, le nom du compte, la devise, la langue, la région et la date du jour",
                pt: "A captura de tela, o nome da conta, a moeda, o idioma, a região e a data de hoje",
                "pt-PT": "A captura de ecrã, o nome da conta, a moeda, o idioma, a região e a data de hoje",
            }),
        },
        deletePending: {
            body: insert(
                t({
                    en: "The {{count}} unpaid installments of {{name}}, {{amount}}, are removed. What's already paid stays.",
                    de: "Die {{count}} offenen Raten von {{name}} über {{amount}} werden entfernt. Bereits Bezahltes bleibt.",
                    es: "Se eliminan las {{count}} cuotas sin pagar de {{name}}, {{amount}}. Lo que ya pagaste se queda.",
                    "es-ES":
                        "Se eliminan los {{count}} plazos sin pagar de {{name}}, {{amount}}. Lo que ya pagaste se queda.",
                    fr: "Les {{count}} échéances impayées de {{name}}, {{amount}}, sont supprimées. Ce qui est déjà payé reste.",
                    pt: "As {{count}} parcelas não pagas de {{name}}, {{amount}}, são removidas. O que já foi pago fica.",
                    "pt-PT":
                        "As {{count}} prestações não pagas de {{name}}, {{amount}}, são removidas. O que já foi pago fica.",
                })
            ),
            bodyOne: insert(
                t({
                    en: "The unpaid installment of {{name}}, {{amount}}, is removed. What's already paid stays.",
                    de: "Die offene Rate von {{name}} über {{amount}} wird entfernt. Bereits Bezahltes bleibt.",
                    es: "Se elimina la cuota sin pagar de {{name}}, {{amount}}. Lo que ya pagaste se queda.",
                    "es-ES": "Se elimina el plazo sin pagar de {{name}}, {{amount}}. Lo que ya pagaste se queda.",
                    fr: "L'échéance impayée de {{name}}, {{amount}}, est supprimée. Ce qui est déjà payé reste.",
                    pt: "A parcela não paga de {{name}}, {{amount}}, é removida. O que já foi pago fica.",
                    "pt-PT": "A prestação não paga de {{name}}, {{amount}}, é removida. O que já foi pago fica.",
                })
            ),
            confirm: t({
                en: "Delete pending",
                de: "Offene löschen",
                es: "Eliminar pendientes",
                fr: "Supprimer le reste",
                pt: "Excluir pendentes",
                "pt-PT": "Eliminar pendentes",
            }),
            done: insert(
                t({
                    en: "Deleted what was left of {{name}}",
                    de: "Rest von {{name}} gelöscht",
                    es: "Eliminaste lo pendiente de {{name}}",
                    fr: "Reste de {{name}} supprimé",
                    pt: "O restante de {{name}} foi excluído",
                    "pt-PT": "O restante de {{name}} foi eliminado",
                })
            ),
            title: t({
                en: "Delete pending installments",
                de: "Offene Raten löschen",
                es: "Eliminar cuotas pendientes",
                "es-ES": "Eliminar plazos pendientes",
                fr: "Supprimer les échéances restantes",
                pt: "Excluir parcelas pendentes",
                "pt-PT": "Eliminar prestações pendentes",
            }),
            whole: insert(
                t({
                    en: "Nothing of {{name}} is paid yet, so its plan goes. The {{amount}} purchase stays on {{account}}.",
                    de: "Von {{name}} ist noch nichts bezahlt, deshalb wird der Plan entfernt. Der Kauf über {{amount}} bleibt auf {{account}}.",
                    es: "No has pagado nada de {{name}}, así que su plan se elimina. La compra de {{amount}} se queda en {{account}}.",
                    fr: "Rien de {{name}} n'est encore payé, donc son plan disparaît. L'achat de {{amount}} reste sur {{account}}.",
                    pt: "Nada de {{name}} foi pago ainda, então o plano sai. A compra de {{amount}} fica em {{account}}.",
                })
            ),
        },
        detail: {
            boughtFor: insert(
                t({
                    en: "Bought {{date}} for",
                    de: "Gekauft am {{date}} für",
                    es: "Comprado el {{date}} por",
                    fr: "Acheté le {{date}} pour",
                    pt: "Comprado em {{date}} por",
                })
            ),
            installmentsLeft: insert(
                t({
                    en: "{{count}} installments",
                    de: "{{count}} Raten",
                    es: "{{count}} cuotas",
                    "es-ES": "{{count}} plazos",
                    fr: "{{count}} échéances",
                    pt: "{{count}} parcelas",
                    "pt-PT": "{{count}} prestações",
                })
            ),
            installmentsLeftOne: t({
                en: "1 installment",
                de: "1 Rate",
                es: "1 cuota",
                "es-ES": "1 plazo",
                fr: "1 échéance",
                pt: "1 parcela",
                "pt-PT": "1 prestação",
            }),
            next: t({ en: "Next", de: "Nächste", es: "Próxima", fr: "Prochaine", pt: "Próxima" }),
            nextIn: insert(
                t({
                    en: "{{date}} · in {{count}} days",
                    de: "{{date}} · in {{count}} Tagen",
                    es: "{{date}} · en {{count}} días",
                    fr: "{{date}} · dans {{count}} jours",
                    pt: "{{date}} · em {{count}} dias",
                })
            ),
            nextToday: insert(
                t({
                    en: "{{date}} · today",
                    de: "{{date}} · heute",
                    es: "{{date}} · hoy",
                    fr: "{{date}} · aujourd'hui",
                    pt: "{{date}} · hoje",
                })
            ),
            nextTomorrow: insert(
                t({
                    en: "{{date}} · tomorrow",
                    de: "{{date}} · morgen",
                    es: "{{date}} · mañana",
                    fr: "{{date}} · demain",
                    pt: "{{date}} · amanhã",
                })
            ),
            nothingLeft: t({
                en: "Nothing left",
                de: "Nichts mehr offen",
                es: "Nada pendiente",
                fr: "Plus rien",
                pt: "Nada pendente",
            }),
            notFound: t({
                en: "This plan isn't here anymore.",
                de: "Diesen Plan gibt es nicht mehr.",
                es: "Este plan ya no está.",
                fr: "Ce plan n'est plus là.",
                pt: "Este plano não está mais aqui.",
            }),
            outside: t({
                en: "Outside Outlayr",
                de: "Außerhalb von Outlayr",
                es: "Fuera de Outlayr",
                fr: "Hors d'Outlayr",
                pt: "Fora do Outlayr",
            }),
            paid: t({ en: "Paid", de: "Bezahlt", es: "Pagado", fr: "Payé", pt: "Pago" }),
            paidOffOn: insert(
                t({
                    en: "Paid off {{date}}",
                    de: "Abbezahlt am {{date}}",
                    es: "Pagada el {{date}}",
                    fr: "Soldée le {{date}}",
                    pt: "Quitada em {{date}}",
                })
            ),
            plan: t({ en: "Plan", de: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
            schedule: t({
                en: "Schedule",
                de: "Zeitplan",
                es: "Cronograma",
                "es-ES": "Calendario",
                fr: "Échéancier",
                pt: "Cronograma",
            }),
            terms: insert(
                t({
                    en: "{{count}} × {{cadence}}",
                    de: "{{count}} × {{cadence}}",
                    es: "{{count}} × {{cadence}}",
                    fr: "{{count}} × {{cadence}}",
                    pt: "{{count}} × {{cadence}}",
                })
            ),
        },
        edit: {
            amountRequired: insert(
                t({
                    en: "Enter an amount over {{zero}}.",
                    de: "Gib einen Betrag über {{zero}} ein.",
                    es: "Ingresa un monto mayor a {{zero}}.",
                    "es-ES": "Ingresa un importe mayor a {{zero}}.",
                    fr: "Saisissez un montant supérieur à {{zero}}.",
                    pt: "Informe um valor maior que {{zero}}.",
                })
            ),
            delete: t({
                en: "Delete installment",
                de: "Rate löschen",
                es: "Eliminar cuota",
                "es-ES": "Eliminar plazo",
                fr: "Supprimer l'échéance",
                pt: "Excluir parcela",
                "pt-PT": "Eliminar prestação",
            }),
            deleted: insert(
                t({
                    en: "Deleted {{installment}}",
                    de: "{{installment}} gelöscht",
                    es: "Eliminaste la {{installment}}",
                    fr: "{{installment}} supprimée",
                    pt: "{{installment}} excluída",
                    "pt-PT": "{{installment}} eliminada",
                })
            ),
            due: t({ en: "Due", de: "Fällig", es: "Vence", fr: "Échéance", pt: "Vencimento" }),
            installment: t({
                en: "Installment",
                de: "Rate",
                es: "Cuota",
                "es-ES": "Plazo",
                fr: "Échéance",
                pt: "Parcela",
                "pt-PT": "Prestação",
            }),
            save: t({
                en: "Save",
                de: "Speichern",
                es: "Guardar",
                fr: "Enregistrer",
                pt: "Salvar",
                "pt-PT": "Guardar",
            }),
            saved: t({
                en: "Installment saved",
                de: "Rate gespeichert",
                es: "Cuota guardada",
                "es-ES": "Plazo guardado",
                fr: "Échéance enregistrée",
                pt: "Parcela salva",
                "pt-PT": "Prestação guardada",
            }),
            totalDue: t({
                en: "Total due",
                de: "Insgesamt fällig",
                es: "Total a pagar",
                fr: "Total dû",
                pt: "Total devido",
            }),
        },
        failed: t({
            en: "Couldn't save that change",
            de: "Die Änderung konnte nicht gespeichert werden",
            es: "No se pudo guardar ese cambio",
            fr: "Impossible d'enregistrer ce changement",
            pt: "Não foi possível salvar essa alteração",
            "pt-PT": "Não foi possível guardar essa alteração",
        }),
        empty: {
            line: t({
                en: "Add a purchase you pay over time and every due date shows up here.",
                de: "Erfasse einen Kauf, den du in Raten zahlst, und jeder Fälligkeitstermin erscheint hier.",
                es: "Agrega una compra que pagas en cuotas y cada fecha de pago aparece aquí.",
                "es-ES": "Añade una compra que pagas en plazos y cada fecha de pago aparece aquí.",
                fr: "Ajoutez un achat payé en plusieurs fois et chaque échéance s'affiche ici.",
                pt: "Adicione uma compra parcelada e cada vencimento aparece aqui.",
                "pt-PT": "Adicione uma compra a prestações e cada vencimento aparece aqui.",
            }),
            title: t({
                en: "No orders yet",
                de: "Noch keine Bestellungen",
                es: "Aún no hay órdenes",
                "es-ES": "Aún no hay pedidos",
                fr: "Aucune commande",
                pt: "Nenhuma compra ainda",
                "pt-PT": "Ainda sem compra",
            }),
        },
        fee: {
            add: t({
                en: "Add late fee",
                de: "Verzugsgebühr hinzufügen",
                es: "Agregar recargo",
                "es-ES": "Añadir recargo",
                fr: "Ajouter des frais de retard",
                pt: "Adicionar multa",
            }),
            label: t({ en: "Late fee", de: "Verzugsgebühr", es: "Recargo", fr: "Frais de retard", pt: "Multa" }),
            note: insert(
                t({
                    en: "Late fee · {{order}}",
                    de: "Verzugsgebühr · {{order}}",
                    es: "Recargo · {{order}}",
                    fr: "Frais de retard · {{order}}",
                    pt: "Multa · {{order}}",
                })
            ),
            remove: t({
                en: "Remove late fee",
                de: "Verzugsgebühr entfernen",
                es: "Quitar recargo",
                fr: "Retirer les frais de retard",
                pt: "Remover multa",
            }),
        },
        importScreenshot: t({
            en: "Import from a screenshot",
            de: "Aus einem Screenshot importieren",
            es: "Importar desde una captura",
            fr: "Importer depuis une capture d'écran",
            pt: "Importar de uma captura de tela",
            "pt-PT": "Importar de uma captura de ecrã",
        }),
        kpi: {
            leftToPay: t({
                en: "Left to pay",
                de: "Noch zu zahlen",
                es: "Por pagar",
                fr: "Reste à payer",
                pt: "Falta pagar",
            }),
            next30: t({
                en: "Next 30 days",
                de: "Nächste 30 Tage",
                es: "Próximos 30 días",
                fr: "30 prochains jours",
                pt: "Próximos 30 dias",
            }),
            nothingOverdue: t({
                en: "Nothing overdue",
                de: "Nichts überfällig",
                es: "Nada vencido",
                fr: "Rien en retard",
                pt: "Nada vencido",
            }),
            ofTotal: insert(
                t({
                    en: "of {{amount}}",
                    de: "von {{amount}}",
                    es: "de {{amount}}",
                    fr: "sur {{amount}}",
                    pt: "de {{amount}}",
                })
            ),
            orders: insert(
                t({
                    en: "{{count}} orders",
                    de: "{{count}} Bestellungen",
                    es: "{{count}} órdenes",
                    "es-ES": "{{count}} pedidos",
                    fr: "{{count}} commandes",
                    pt: "{{count}} compras",
                })
            ),
            ordersOne: t({ en: "1 order", de: "1 Bestellung", es: "1 orden", fr: "1 commande", pt: "1 compra" }),
            overdue: t({ en: "Overdue", de: "Überfällig", es: "Vencido", fr: "En retard", pt: "Vencido" }),
            overdueMore: insert(
                t({
                    en: "{{name}} + {{count}} more",
                    de: "{{name}} + {{count}} weitere",
                    es: "{{name}} y {{count}} más",
                    fr: "{{name}} + {{count}} autres",
                    pt: "{{name}} + {{count}} outras",
                })
            ),
            paidSoFar: t({
                en: "Paid so far",
                de: "Bisher bezahlt",
                es: "Pagado hasta ahora",
                fr: "Payé jusqu'ici",
                pt: "Pago até agora",
            }),
            payments: insert(
                t({
                    en: "{{count}} payments",
                    de: "{{count}} Zahlungen",
                    es: "{{count}} pagos",
                    fr: "{{count}} paiements",
                    pt: "{{count}} pagamentos",
                })
            ),
            paymentsOne: t({ en: "1 payment", de: "1 Zahlung", es: "1 pago", fr: "1 paiement", pt: "1 pagamento" }),
            since: insert(
                t({
                    en: "Since {{date}}",
                    de: "Seit {{date}}",
                    es: "Desde el {{date}}",
                    fr: "Depuis le {{date}}",
                    pt: "Desde {{date}}",
                })
            ),
        },
        menu: {
            deleteInstallment: t({
                en: "Delete installment",
                de: "Rate löschen",
                es: "Eliminar cuota",
                "es-ES": "Eliminar plazo",
                fr: "Supprimer l'échéance",
                pt: "Excluir parcela",
                "pt-PT": "Eliminar prestação",
            }),
            deletePending: t({
                en: "Delete pending",
                de: "Offene löschen",
                es: "Eliminar pendientes",
                fr: "Supprimer le reste",
                pt: "Excluir pendentes",
                "pt-PT": "Eliminar pendentes",
            }),
            edit: t({
                en: "Edit installment",
                de: "Rate bearbeiten",
                es: "Editar cuota",
                "es-ES": "Editar plazo",
                fr: "Modifier l'échéance",
                pt: "Editar parcela",
                "pt-PT": "Editar prestação",
            }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    de: "Mehr zu {{name}}",
                    es: "Más opciones para {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            open: t({ en: "Open plan", de: "Plan öffnen", es: "Abrir plan", fr: "Ouvrir le plan", pt: "Abrir plano" }),
            openAccount: insert(
                t({
                    en: "Open {{name}}",
                    de: "{{name}} öffnen",
                    es: "Abrir {{name}}",
                    fr: "Ouvrir {{name}}",
                    pt: "Abrir {{name}}",
                })
            ),
            pay: insert(
                t({
                    en: "Pay {{amount}}",
                    de: "{{amount}} zahlen",
                    es: "Pagar {{amount}}",
                    fr: "Payer {{amount}}",
                    pt: "Pagar {{amount}}",
                })
            ),
            payAll: insert(
                t({
                    en: "Pay all {{amount}}",
                    de: "Alle {{amount}} zahlen",
                    es: "Pagar todo {{amount}}",
                    fr: "Tout payer {{amount}}",
                    pt: "Pagar tudo {{amount}}",
                })
            ),
        },
        newPurchase: t({
            en: "New purchase",
            de: "Neuer Kauf",
            es: "Nueva compra",
            fr: "Nouvel achat",
            pt: "Nova compra",
        }),
        pay: {
            accountAfter: insert(
                t({
                    en: "{{account}} after this",
                    de: "{{account}} danach",
                    es: "{{account}} después de esto",
                    fr: "{{account}} après ceci",
                    pt: "{{account}} depois disso",
                })
            ),
            allTitle: insert(
                t({
                    en: "Pay all · {{name}}",
                    de: "Alles zahlen · {{name}}",
                    es: "Pagar todo · {{name}}",
                    fr: "Tout payer · {{name}}",
                    pt: "Pagar tudo · {{name}}",
                })
            ),
            amount: t({ en: "Amount", de: "Betrag", es: "Monto", "es-ES": "Importe", fr: "Montant", pt: "Valor" }),
            amountRequired: insert(
                t({
                    en: "Enter an amount over {{zero}}.",
                    de: "Gib einen Betrag über {{zero}} ein.",
                    es: "Ingresa un monto mayor a {{zero}}.",
                    "es-ES": "Ingresa un importe mayor a {{zero}}.",
                    fr: "Saisissez un montant supérieur à {{zero}}.",
                    pt: "Informe um valor maior que {{zero}}.",
                })
            ),
            date: t({ en: "Date", de: "Datum", es: "Fecha", fr: "Date", pt: "Data" }),
            failed: t({
                en: "Couldn't save the payment",
                de: "Die Zahlung konnte nicht gespeichert werden",
                es: "No se pudo guardar el pago",
                fr: "Impossible d'enregistrer le paiement",
                pt: "Não foi possível salvar o pagamento",
                "pt-PT": "Não foi possível guardar o pagamento",
            }),
            from: t({ en: "From", de: "Von", es: "Desde", fr: "Depuis", pt: "De" }),
            leaves: insert(
                t({
                    en: "Leaves {{account}}",
                    de: "Verlässt {{account}}",
                    es: "Sale de {{account}}",
                    fr: "Quitte {{account}}",
                    pt: "Sai de {{account}}",
                })
            ),
            leftAfter: t({
                en: "Left to pay after this",
                de: "Danach noch zu zahlen",
                es: "Queda por pagar después",
                fr: "Reste à payer après ceci",
                pt: "Falta pagar depois disso",
            }),
            noRate: t({
                en: "No exchange rate for that day yet.",
                de: "Für diesen Tag gibt es noch keinen Wechselkurs.",
                es: "Aún no hay tasa de cambio para ese día.",
                "es-ES": "Aún No hay tipo de cambio de cambio para ese día.",
                fr: "Pas encore de taux de change pour ce jour.",
                pt: "Ainda não há cotação para esse dia.",
            }),
            none: t({ en: "None", de: "Keine", es: "Ninguna", fr: "Aucun", pt: "Nenhuma" }),
            noneHint: insert(
                t({
                    en: "Paid outside Outlayr. You owe {{account}} less, no bank changes.",
                    de: "Außerhalb von Outlayr bezahlt. Du schuldest {{account}} weniger, ohne Änderung bei der Bank.",
                    es: "Pagado fuera de Outlayr. Le debes menos a {{account}} y ningún banco cambia.",
                    fr: "Payé hors d'Outlayr. Vous devez moins à {{account}}, aucune banque ne bouge.",
                    pt: "Pago fora do Outlayr. Você deve menos a {{account}}, sem mudar nenhum banco.",
                    "pt-PT": "Pago fora do Outlayr. deve menos a {{account}}, sem mudar nenhum banco.",
                })
            ),
            overLeft: insert(
                t({
                    en: "Only {{amount}} is left to pay.",
                    de: "Nur noch {{amount}} sind zu zahlen.",
                    es: "Solo quedan {{amount}} por pagar.",
                    fr: "Il ne reste que {{amount}} à payer.",
                    pt: "Só faltam {{amount}} para pagar.",
                })
            ),
            saved: insert(
                t({
                    en: "Paid {{amount}} toward {{name}}",
                    de: "{{amount}} auf {{name}} gezahlt",
                    es: "Pagaste {{amount}} de {{name}}",
                    fr: "{{amount}} payés pour {{name}}",
                    pt: "{{amount}} pagos de {{name}}",
                })
            ),
            submit: insert(
                t({
                    en: "Pay {{amount}}",
                    de: "{{amount}} zahlen",
                    es: "Pagar {{amount}}",
                    fr: "Payer {{amount}}",
                    pt: "Pagar {{amount}}",
                })
            ),
            submitEmpty: t({ en: "Pay", de: "Zahlen", es: "Pagar", fr: "Payer", pt: "Pagar" }),
            subtitle: insert(
                t({
                    en: "{{name}} · {{index}} of {{count}}",
                    de: "{{name}} · {{index}} von {{count}}",
                    es: "{{name}} · {{index}} de {{count}}",
                    fr: "{{name}} · {{index}} sur {{count}}",
                    pt: "{{name}} · {{index}} de {{count}}",
                })
            ),
            subtitleUpfront: insert(
                t({
                    en: "{{name}} · upfront",
                    de: "{{name}} · Anzahlung",
                    es: "{{name}} · inicial",
                    fr: "{{name}} · acompte",
                    pt: "{{name}} · entrada",
                })
            ),
            title: insert(
                t({
                    en: "Pay {{account}}",
                    de: "{{account}} bezahlen",
                    es: "Pagar {{account}}",
                    fr: "Payer {{account}}",
                    pt: "Pagar {{account}}",
                })
            ),
        },
        paidOffCount: insert(
            t({
                en: "{{count}} paid off",
                de: "{{count}} abbezahlt",
                es: "{{count}} pagadas",
                fr: "{{count}} soldées",
                pt: "{{count}} quitadas",
            })
        ),
        plan: {
            each: insert(
                t({
                    en: "{{count}} × {{amount}}",
                    de: "{{count}} × {{amount}}",
                    es: "{{count}} × {{amount}}",
                    fr: "{{count}} × {{amount}}",
                    pt: "{{count}} × {{amount}}",
                })
            ),
            mixed: insert(
                t({
                    en: "{{count}} installments",
                    de: "{{count}} Raten",
                    es: "{{count}} cuotas",
                    "es-ES": "{{count}} plazos",
                    fr: "{{count}} échéances",
                    pt: "{{count}} parcelas",
                    "pt-PT": "{{count}} prestações",
                })
            ),
            upfront: t({
                en: "Upfront",
                de: "Anzahlung",
                es: "Inicial",
                "es-ES": "Entrada",
                fr: "Acompte",
                pt: "Entrada",
            }),
            withUpfront: insert(
                t({
                    en: "Upfront + {{rest}}",
                    de: "Anzahlung + {{rest}}",
                    es: "Inicial + {{rest}}",
                    fr: "Acompte + {{rest}}",
                    pt: "Entrada + {{rest}}",
                })
            ),
        },
        progress: insert(
            t({
                en: "{{paid}} of {{count}}",
                de: "{{paid}} von {{count}}",
                es: "{{paid}} de {{count}}",
                fr: "{{paid}} sur {{count}}",
                pt: "{{paid}} de {{count}}",
            })
        ),
        row: {
            installment: insert(
                t({
                    en: "Installment {{index}} of {{count}}",
                    de: "Rate {{index}} von {{count}}",
                    es: "Cuota {{index}} de {{count}}",
                    "es-ES": "Plazo {{index}} de {{count}}",
                    fr: "Échéance {{index}} sur {{count}}",
                    pt: "Parcela {{index}} de {{count}}",
                    "pt-PT": "Prestação {{index}} de {{count}}",
                })
            ),
            upfront: t({
                en: "Upfront",
                de: "Anzahlung",
                es: "Inicial",
                "es-ES": "Entrada",
                fr: "Acompte",
                pt: "Entrada",
            }),
        },
        scan: {
            account: t({ en: "Account", de: "Konto", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            choose: t({
                en: "Choose screenshot",
                de: "Screenshot auswählen",
                es: "Elegir captura",
                fr: "Choisir une capture",
                pt: "Escolher captura de tela",
                "pt-PT": "Escolher captura de ecrã",
            }),
            chooseAccount: t({
                en: "Choose account",
                de: "Konto auswählen",
                es: "Elegir cuenta",
                fr: "Choisir le compte",
                pt: "Escolher conta",
            }),
            currency: insert(
                t({
                    en: "This plan is in {{plan}} and {{account}} is in {{currency}}.",
                    de: "Dieser Plan läuft in {{plan}}, und {{account}} in {{currency}}.",
                    es: "Este plan está en {{plan}} y {{account}} está en {{currency}}.",
                    fr: "Cet échéancier est en {{plan}} et {{account}} en {{currency}}.",
                    pt: "Este plano está em {{plan}} e {{account}} está em {{currency}}.",
                })
            ),
            drop: t({
                en: "Drop it here or paste it",
                de: "Hierher ziehen oder einfügen",
                es: "Suéltala aquí o pégala",
                fr: "Déposez-la ici ou collez-la",
                pt: "Solte aqui ou cole",
            }),
            failed: {
                notConfigured: t({
                    en: "Importing a screenshot needs the cloud tier.",
                    de: "Der Screenshot-Import braucht den Cloud-Tarif.",
                    es: "Para importar una captura se necesita el servicio en la nube.",
                    fr: "L'import d'une capture nécessite le service cloud.",
                    pt: "Importar uma captura de tela requer o serviço na nuvem.",
                    "pt-PT": "Importar uma captura de ecrã requer o serviço na nuvem.",
                }),
                notEntitled: t({
                    en: "Your free captures are used up. They come back within 30 days; Pro lifts the limit.",
                    de: "Deine kostenlosen Erfassungen sind aufgebraucht. Sie kommen innerhalb von 30 Tagen zurück; mit Pro entfällt das Limit.",
                    es: "Ya usaste tus capturas gratis. Se renuevan en menos de 30 días; con Pro no tienes ese límite.",
                    fr: "Vos captures gratuites sont épuisées. Elles reviennent sous 30 jours ; Pro supprime la limite.",
                    pt: "Suas capturas grátis acabaram. Elas voltam em até 30 dias; o Pro remove o limite.",
                }),
                notImage: t({
                    en: "Couldn't open that image.",
                    de: "Das Bild konnte nicht geöffnet werden.",
                    es: "No pude abrir esa imagen.",
                    fr: "Impossible d'ouvrir cette image.",
                    pt: "Não consegui abrir essa imagem.",
                }),
                offline: t({
                    en: "You're offline.",
                    de: "Du bist offline.",
                    es: "Estás sin conexión.",
                    fr: "Vous êtes hors ligne.",
                    pt: "Você está sem conexão.",
                    "pt-PT": "Está sem ligação.",
                }),
                provider: t({
                    en: "Couldn't read the plan.",
                    de: "Der Plan konnte nicht gelesen werden.",
                    es: "No pude leer el plan.",
                    fr: "Impossible de lire l'échéancier.",
                    pt: "Não consegui ler o plano.",
                }),
                quotaExceeded: t({
                    en: "The fair-use limit for captures is reached. It resets within 30 days.",
                    de: "Das Fair-Use-Limit für Erfassungen ist erreicht. Es wird innerhalb von 30 Tagen zurückgesetzt.",
                    es: "Llegaste al límite de uso justo de capturas. Se renueva en menos de 30 días.",
                    "es-ES": "Has llegado al límite de uso justo de capturas. Se renueva en menos de 30 días.",
                    fr: "La limite d'utilisation raisonnable des captures est atteinte. Elle se réinitialise sous 30 jours.",
                    pt: "Você atingiu o limite de uso justo de capturas. Ele se renova em até 30 dias.",
                    "pt-PT": "Atingiu o limite de utilização justa de capturas. Renova-se no prazo de 30 dias.",
                }),
                rateLimited: t({
                    en: "That's a lot of screenshots at once. Give it a moment.",
                    de: "Das sind viele Screenshots auf einmal. Gib uns einen Moment.",
                    es: "Son muchas capturas seguidas. Espera un momento.",
                    fr: "Beaucoup de captures d'un coup. Patientez un instant.",
                    pt: "São muitas capturas seguidas. Espere um momento.",
                }),
                unauthenticated: t({
                    en: "Sign in to import a screenshot.",
                    de: "Melde dich an, um einen Screenshot zu importieren.",
                    es: "Inicia sesión para importar una captura.",
                    fr: "Connectez-vous pour importer une capture.",
                    pt: "Entre para importar uma captura de tela.",
                    "pt-PT": "Inicie sessão para importar uma captura de ecrã.",
                }),
                unclear: t({
                    en: "Didn't find a payment plan in that image.",
                    de: "In diesem Bild wurde kein Zahlungsplan gefunden.",
                    es: "No encontré un plan de cuotas en esa imagen.",
                    "es-ES": "No encontré un plan de plazos en esa imagen.",
                    fr: "Aucun échéancier trouvé dans cette image.",
                    pt: "Não encontrei um plano de parcelas nessa imagem.",
                    "pt-PT": "Não encontrei um plano de prestações nessa imagem.",
                }),
            },
            intro: t({
                en: "A screenshot of the order's payment plan.",
                de: "Ein Screenshot vom Zahlungsplan der Bestellung.",
                es: "Una captura del plan de pagos de la orden.",
                fr: "Une capture d'écran de l'échéancier de la commande.",
                pt: "Uma captura de tela do plano de pagamento da compra.",
                "pt-PT": "Uma captura de ecrã do plano de pagamento da compra.",
            }),
            noCard: t({
                en: "Add a card or loan to import its plan.",
                de: "Füge eine Karte oder einen Kredit hinzu, um den Plan zu importieren.",
                es: "Agrega una tarjeta o préstamo para importar su plan.",
                "es-ES": "Añade una tarjeta o préstamo para importar su plan.",
                fr: "Ajoutez une carte ou un prêt pour importer son échéancier.",
                pt: "Adicione um cartão ou empréstimo para importar o plano.",
            }),
            reading: t({
                en: "Reading the plan…",
                de: "Plan wird gelesen…",
                es: "Leyendo el plan…",
                fr: "Lecture de l'échéancier…",
                pt: "Lendo o plano…",
                "pt-PT": "A ler o plano…",
            }),
            retry: t({
                en: "Try again",
                de: "Versuch es noch mal",
                es: "Reintentar",
                fr: "Réessayer",
                pt: "Tentar de novo",
            }),
            title: t({
                en: "Import from a screenshot",
                de: "Aus einem Screenshot importieren",
                es: "Importar desde una captura",
                fr: "Importer depuis une capture d'écran",
                pt: "Importar de uma captura de tela",
                "pt-PT": "Importar de uma captura de ecrã",
            }),
        },
        status: {
            comingUp: t({ en: "Coming up", de: "Demnächst", es: "Próxima", fr: "À venir", pt: "Próxima" }),
            inDays: insert(
                t({
                    en: "In {{count}} days",
                    de: "In {{count}} Tagen",
                    es: "En {{count}} días",
                    fr: "Dans {{count}} jours",
                    pt: "Em {{count}} dias",
                })
            ),
            overdue: t({ en: "Overdue", de: "Überfällig", es: "Vencida", fr: "En retard", pt: "Vencida" }),
            paid: t({ en: "Paid", de: "Bezahlt", es: "Pagada", fr: "Payée", pt: "Paga" }),
            partial: t({
                en: "Partly paid",
                de: "Teilweise bezahlt",
                es: "Pago parcial",
                fr: "Payée en partie",
                pt: "Paga em parte",
            }),
            today: t({ en: "Today", de: "Heute", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
            tomorrow: t({ en: "Tomorrow", de: "Morgen", es: "Mañana", fr: "Demain", pt: "Amanhã" }),
        },
        tabs: {
            allAccounts: t({
                en: "All accounts",
                de: "Alle Konten",
                es: "Todas las cuentas",
                fr: "Tous les comptes",
                pt: "Todas as contas",
            }),
            orders: t({
                en: "Orders",
                de: "Bestellungen",
                es: "Órdenes",
                "es-ES": "Pedidos",
                fr: "Commandes",
                pt: "Compras",
            }),
            paidOff: t({ en: "Paid off", de: "Abbezahlt", es: "Pagadas", fr: "Soldées", pt: "Quitadas" }),
        },
        title: t({
            en: "Installments",
            de: "Raten",
            es: "Cuotas",
            "es-ES": "Plazos",
            fr: "Paiements échelonnés",
            pt: "Parcelas",
            "pt-PT": "Prestações",
        }),
    },
    key: "dashboard-installments",
} satisfies Dictionary;

export default dashboardInstallments;
