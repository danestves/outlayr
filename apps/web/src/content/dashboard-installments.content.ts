import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardInstallments = {
    content: {
        back: t({
            en: "Back to installments",
            es: "Volver a cuotas",
            fr: "Retour aux paiements échelonnés",
            pt: "Voltar às parcelas",
        }),
        cadence: {
            days: insert(
                t({
                    en: "every {{count}} days",
                    es: "cada {{count}} días",
                    fr: "tous les {{count}} jours",
                    pt: "a cada {{count}} dias",
                })
            ),
            monthly: t({ en: "every month", es: "cada mes", fr: "chaque mois", pt: "todo mês" }),
            semimonthly: t({
                en: "twice a month",
                es: "dos veces al mes",
                fr: "deux fois par mois",
                pt: "duas vezes por mês",
            }),
            weekly: t({ en: "every week", es: "cada semana", fr: "chaque semaine", pt: "toda semana" }),
        },
        cancel: t({ en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        columns: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            due: t({ en: "Due", es: "Vence", fr: "Échéance", pt: "Vencimento" }),
            installment: t({ en: "Installment", es: "Cuota", fr: "Échéance", pt: "Parcela" }),
            leftAfter: t({ en: "Left after", es: "Queda después", fr: "Reste après", pt: "Resta depois" }),
            leftToPay: t({ en: "Left to pay", es: "Por pagar", fr: "Reste à payer", pt: "Falta pagar" }),
            next: t({ en: "Next", es: "Próxima", fr: "Prochaine", pt: "Próxima" }),
            order: t({ en: "Order", es: "Orden", fr: "Commande", pt: "Compra" }),
            paidFrom: t({ en: "Paid from", es: "Pagada desde", fr: "Payée depuis", pt: "Paga com" }),
            paidOff: t({ en: "Paid off", es: "Pagada", fr: "Soldée", pt: "Quitada" }),
            plan: t({ en: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
            price: t({ en: "Price", es: "Precio", fr: "Prix", pt: "Preço" }),
            progress: t({ en: "Progress", es: "Progreso", fr: "Progression", pt: "Progresso" }),
            status: t({ en: "Status", es: "Estado", fr: "Statut", pt: "Status" }),
        },
        comingUp: t({ en: "Coming up", es: "Próximas", fr: "À venir", pt: "Próximas" }),
        consent: {
            allow: t({ en: "Allow", es: "Permitir", fr: "Autoriser", pt: "Permitir" }),
            fine: t({
                en: "It goes through our server to a third-party AI provider, which never gets your name, email, or account ID. We don't keep the screenshot.",
                es: "Pasa por nuestro servidor hacia un proveedor de IA externo, que nunca recibe tu nombre, tu correo ni el ID de tu cuenta. No guardamos la captura.",
                fr: "Elle passe par notre serveur vers un fournisseur d'IA tiers, qui ne reçoit jamais votre nom, votre e-mail ni l'identifiant de votre compte. Nous ne conservons pas la capture.",
                pt: "Ela passa pelo nosso servidor até um provedor de IA terceiro, que nunca recebe seu nome, e-mail ou ID da conta. Não guardamos a captura.",
            }),
            notNow: t({ en: "Not now", es: "Ahora no", fr: "Pas maintenant", pt: "Agora não" }),
            planScan: t({
                en: "Installment plan import",
                es: "Importar un plan de cuotas",
                fr: "Import d'échéancier",
                pt: "Importar compra parcelada",
            }),
            planScanSends: t({
                en: "The screenshot, the account's name, currency, language, region, and today's date",
                es: "La captura, el nombre de la cuenta, la moneda, el idioma, la región y la fecha de hoy",
                fr: "La capture d'écran, le nom du compte, la devise, la langue, la région et la date du jour",
                pt: "A captura de tela, o nome da conta, a moeda, o idioma, a região e a data de hoje",
            }),
            privacy: t({
                en: "Privacy policy",
                es: "Política de privacidad",
                fr: "Politique de confidentialité",
                pt: "Política de privacidade",
            }),
            title: t({
                en: "Send data to third-party AI providers?",
                es: "¿Enviar datos a proveedores de IA externos?",
                fr: "Envoyer des données à des fournisseurs d'IA tiers ?",
                pt: "Enviar dados a provedores de IA terceiros?",
            }),
        },
        deletePending: {
            body: insert(
                t({
                    en: "The {{count}} unpaid installments of {{name}}, {{amount}}, are removed. What's already paid stays.",
                    es: "Se eliminan las {{count}} cuotas sin pagar de {{name}}, {{amount}}. Lo que ya pagaste se queda.",
                    fr: "Les {{count}} échéances impayées de {{name}}, {{amount}}, sont supprimées. Ce qui est déjà payé reste.",
                    pt: "As {{count}} parcelas não pagas de {{name}}, {{amount}}, são removidas. O que já foi pago fica.",
                })
            ),
            bodyOne: insert(
                t({
                    en: "The unpaid installment of {{name}}, {{amount}}, is removed. What's already paid stays.",
                    es: "Se elimina la cuota sin pagar de {{name}}, {{amount}}. Lo que ya pagaste se queda.",
                    fr: "L'échéance impayée de {{name}}, {{amount}}, est supprimée. Ce qui est déjà payé reste.",
                    pt: "A parcela não paga de {{name}}, {{amount}}, é removida. O que já foi pago fica.",
                })
            ),
            confirm: t({
                en: "Delete pending",
                es: "Eliminar pendientes",
                fr: "Supprimer le reste",
                pt: "Excluir pendentes",
            }),
            done: insert(
                t({
                    en: "Deleted what was left of {{name}}",
                    es: "Eliminaste lo pendiente de {{name}}",
                    fr: "Reste de {{name}} supprimé",
                    pt: "O restante de {{name}} foi excluído",
                })
            ),
            title: t({
                en: "Delete pending installments",
                es: "Eliminar cuotas pendientes",
                fr: "Supprimer les échéances restantes",
                pt: "Excluir parcelas pendentes",
            }),
            whole: insert(
                t({
                    en: "Nothing of {{name}} is paid yet, so its plan goes. The {{amount}} purchase stays on {{account}}.",
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
                    es: "Comprado el {{date}} por",
                    fr: "Acheté le {{date}} pour",
                    pt: "Comprado em {{date}} por",
                })
            ),
            installmentsLeft: insert(
                t({
                    en: "{{count}} installments",
                    es: "{{count}} cuotas",
                    fr: "{{count}} échéances",
                    pt: "{{count}} parcelas",
                })
            ),
            installmentsLeftOne: t({ en: "1 installment", es: "1 cuota", fr: "1 échéance", pt: "1 parcela" }),
            next: t({ en: "Next", es: "Próxima", fr: "Prochaine", pt: "Próxima" }),
            nextIn: insert(
                t({
                    en: "{{date}} · in {{count}} days",
                    es: "{{date}} · en {{count}} días",
                    fr: "{{date}} · dans {{count}} jours",
                    pt: "{{date}} · em {{count}} dias",
                })
            ),
            nextToday: insert(
                t({ en: "{{date}} · today", es: "{{date}} · hoy", fr: "{{date}} · aujourd'hui", pt: "{{date}} · hoje" })
            ),
            nextTomorrow: insert(
                t({
                    en: "{{date}} · tomorrow",
                    es: "{{date}} · mañana",
                    fr: "{{date}} · demain",
                    pt: "{{date}} · amanhã",
                })
            ),
            nothingLeft: t({ en: "Nothing left", es: "Nada pendiente", fr: "Plus rien", pt: "Nada pendente" }),
            notFound: t({
                en: "This plan isn't here anymore.",
                es: "Este plan ya no está.",
                fr: "Ce plan n'est plus là.",
                pt: "Este plano não está mais aqui.",
            }),
            outside: t({ en: "Outside Outlayr", es: "Fuera de Outlayr", fr: "Hors d'Outlayr", pt: "Fora do Outlayr" }),
            paid: t({ en: "Paid", es: "Pagado", fr: "Payé", pt: "Pago" }),
            paidOffOn: insert(
                t({
                    en: "Paid off {{date}}",
                    es: "Pagada el {{date}}",
                    fr: "Soldée le {{date}}",
                    pt: "Quitada em {{date}}",
                })
            ),
            plan: t({ en: "Plan", es: "Plan", fr: "Plan", pt: "Plano" }),
            schedule: t({ en: "Schedule", es: "Cronograma", fr: "Échéancier", pt: "Cronograma" }),
            terms: insert(
                t({
                    en: "{{count}} × {{cadence}}",
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
                    es: "Ingresa un monto mayor a {{zero}}.",
                    fr: "Saisissez un montant supérieur à {{zero}}.",
                    pt: "Informe um valor maior que {{zero}}.",
                })
            ),
            delete: t({
                en: "Delete installment",
                es: "Eliminar cuota",
                fr: "Supprimer l'échéance",
                pt: "Excluir parcela",
            }),
            deleted: insert(
                t({
                    en: "Deleted {{installment}}",
                    es: "Eliminaste la {{installment}}",
                    fr: "{{installment}} supprimée",
                    pt: "{{installment}} excluída",
                })
            ),
            due: t({ en: "Due", es: "Vence", fr: "Échéance", pt: "Vencimento" }),
            installment: t({ en: "Installment", es: "Cuota", fr: "Échéance", pt: "Parcela" }),
            save: t({ en: "Save", es: "Guardar", fr: "Enregistrer", pt: "Salvar" }),
            saved: t({
                en: "Installment saved",
                es: "Cuota guardada",
                fr: "Échéance enregistrée",
                pt: "Parcela salva",
            }),
            totalDue: t({ en: "Total due", es: "Total a pagar", fr: "Total dû", pt: "Total devido" }),
        },
        failed: t({
            en: "Couldn't save that change",
            es: "No se pudo guardar ese cambio",
            fr: "Impossible d'enregistrer ce changement",
            pt: "Não foi possível salvar essa alteração",
        }),
        empty: {
            line: t({
                en: "Add a purchase you pay over time and every due date shows up here.",
                es: "Agrega una compra que pagas en cuotas y cada fecha de pago aparece aquí.",
                fr: "Ajoutez un achat payé en plusieurs fois et chaque échéance s'affiche ici.",
                pt: "Adicione uma compra parcelada e cada vencimento aparece aqui.",
            }),
            title: t({
                en: "No orders yet",
                es: "Aún no hay órdenes",
                fr: "Aucune commande",
                pt: "Nenhuma compra ainda",
            }),
        },
        fee: {
            add: t({
                en: "Add late fee",
                es: "Agregar recargo",
                fr: "Ajouter des frais de retard",
                pt: "Adicionar multa",
            }),
            label: t({ en: "Late fee", es: "Recargo", fr: "Frais de retard", pt: "Multa" }),
            note: insert(
                t({
                    en: "Late fee · {{order}}",
                    es: "Recargo · {{order}}",
                    fr: "Frais de retard · {{order}}",
                    pt: "Multa · {{order}}",
                })
            ),
            remove: t({
                en: "Remove late fee",
                es: "Quitar recargo",
                fr: "Retirer les frais de retard",
                pt: "Remover multa",
            }),
        },
        importScreenshot: t({
            en: "Import from a screenshot",
            es: "Importar desde una captura",
            fr: "Importer depuis une capture d'écran",
            pt: "Importar de uma captura de tela",
        }),
        kpi: {
            leftToPay: t({ en: "Left to pay", es: "Por pagar", fr: "Reste à payer", pt: "Falta pagar" }),
            next30: t({ en: "Next 30 days", es: "Próximos 30 días", fr: "30 prochains jours", pt: "Próximos 30 dias" }),
            nothingOverdue: t({
                en: "Nothing overdue",
                es: "Nada vencido",
                fr: "Rien en retard",
                pt: "Nada vencido",
            }),
            ofTotal: insert(t({ en: "of {{amount}}", es: "de {{amount}}", fr: "sur {{amount}}", pt: "de {{amount}}" })),
            orders: insert(
                t({
                    en: "{{count}} orders",
                    es: "{{count}} órdenes",
                    fr: "{{count}} commandes",
                    pt: "{{count}} compras",
                })
            ),
            ordersOne: t({ en: "1 order", es: "1 orden", fr: "1 commande", pt: "1 compra" }),
            overdue: t({ en: "Overdue", es: "Vencido", fr: "En retard", pt: "Vencido" }),
            overdueMore: insert(
                t({
                    en: "{{name}} + {{count}} more",
                    es: "{{name}} y {{count}} más",
                    fr: "{{name}} + {{count}} autres",
                    pt: "{{name}} + {{count}} outras",
                })
            ),
            paidSoFar: t({ en: "Paid so far", es: "Pagado hasta ahora", fr: "Payé jusqu'ici", pt: "Pago até agora" }),
            payments: insert(
                t({
                    en: "{{count}} payments",
                    es: "{{count}} pagos",
                    fr: "{{count}} paiements",
                    pt: "{{count}} pagamentos",
                })
            ),
            paymentsOne: t({ en: "1 payment", es: "1 pago", fr: "1 paiement", pt: "1 pagamento" }),
            since: insert(
                t({ en: "Since {{date}}", es: "Desde el {{date}}", fr: "Depuis le {{date}}", pt: "Desde {{date}}" })
            ),
        },
        menu: {
            deleteInstallment: t({
                en: "Delete installment",
                es: "Eliminar cuota",
                fr: "Supprimer l'échéance",
                pt: "Excluir parcela",
            }),
            deletePending: t({
                en: "Delete pending",
                es: "Eliminar pendientes",
                fr: "Supprimer le reste",
                pt: "Excluir pendentes",
            }),
            edit: t({ en: "Edit installment", es: "Editar cuota", fr: "Modifier l'échéance", pt: "Editar parcela" }),
            more: insert(
                t({
                    en: "More for {{name}}",
                    es: "Más opciones para {{name}}",
                    fr: "Plus pour {{name}}",
                    pt: "Mais para {{name}}",
                })
            ),
            open: t({ en: "Open plan", es: "Abrir plan", fr: "Ouvrir le plan", pt: "Abrir plano" }),
            openAccount: insert(
                t({ en: "Open {{name}}", es: "Abrir {{name}}", fr: "Ouvrir {{name}}", pt: "Abrir {{name}}" })
            ),
            pay: insert(
                t({ en: "Pay {{amount}}", es: "Pagar {{amount}}", fr: "Payer {{amount}}", pt: "Pagar {{amount}}" })
            ),
            payAll: insert(
                t({
                    en: "Pay all {{amount}}",
                    es: "Pagar todo {{amount}}",
                    fr: "Tout payer {{amount}}",
                    pt: "Pagar tudo {{amount}}",
                })
            ),
        },
        newPurchase: t({ en: "New purchase", es: "Nueva compra", fr: "Nouvel achat", pt: "Nova compra" }),
        pay: {
            accountAfter: insert(
                t({
                    en: "{{account}} after this",
                    es: "{{account}} después de esto",
                    fr: "{{account}} après ceci",
                    pt: "{{account}} depois disso",
                })
            ),
            allTitle: insert(
                t({
                    en: "Pay all · {{name}}",
                    es: "Pagar todo · {{name}}",
                    fr: "Tout payer · {{name}}",
                    pt: "Pagar tudo · {{name}}",
                })
            ),
            amount: t({ en: "Amount", es: "Monto", fr: "Montant", pt: "Valor" }),
            amountRequired: insert(
                t({
                    en: "Enter an amount over {{zero}}.",
                    es: "Ingresa un monto mayor a {{zero}}.",
                    fr: "Saisissez un montant supérieur à {{zero}}.",
                    pt: "Informe um valor maior que {{zero}}.",
                })
            ),
            date: t({ en: "Date", es: "Fecha", fr: "Date", pt: "Data" }),
            failed: t({
                en: "Couldn't save the payment",
                es: "No se pudo guardar el pago",
                fr: "Impossible d'enregistrer le paiement",
                pt: "Não foi possível salvar o pagamento",
            }),
            from: t({ en: "From", es: "Desde", fr: "Depuis", pt: "De" }),
            leaves: insert(
                t({
                    en: "Leaves {{account}}",
                    es: "Sale de {{account}}",
                    fr: "Quitte {{account}}",
                    pt: "Sai de {{account}}",
                })
            ),
            leftAfter: t({
                en: "Left to pay after this",
                es: "Queda por pagar después",
                fr: "Reste à payer après ceci",
                pt: "Falta pagar depois disso",
            }),
            noRate: t({
                en: "No exchange rate for that day yet.",
                es: "Aún no hay tasa de cambio para ese día.",
                fr: "Pas encore de taux de change pour ce jour.",
                pt: "Ainda não há cotação para esse dia.",
            }),
            none: t({ en: "None", es: "Ninguna", fr: "Aucun", pt: "Nenhuma" }),
            noneHint: insert(
                t({
                    en: "Paid outside Outlayr. You owe {{account}} less, no bank changes.",
                    es: "Pagado fuera de Outlayr. Le debes menos a {{account}} y ningún banco cambia.",
                    fr: "Payé hors d'Outlayr. Vous devez moins à {{account}}, aucune banque ne bouge.",
                    pt: "Pago fora do Outlayr. Você deve menos a {{account}}, sem mudar nenhum banco.",
                })
            ),
            overLeft: insert(
                t({
                    en: "Only {{amount}} is left to pay.",
                    es: "Solo quedan {{amount}} por pagar.",
                    fr: "Il ne reste que {{amount}} à payer.",
                    pt: "Só faltam {{amount}} para pagar.",
                })
            ),
            saved: insert(
                t({
                    en: "Paid {{amount}} toward {{name}}",
                    es: "Pagaste {{amount}} de {{name}}",
                    fr: "{{amount}} payés pour {{name}}",
                    pt: "{{amount}} pagos de {{name}}",
                })
            ),
            submit: insert(
                t({ en: "Pay {{amount}}", es: "Pagar {{amount}}", fr: "Payer {{amount}}", pt: "Pagar {{amount}}" })
            ),
            submitEmpty: t({ en: "Pay", es: "Pagar", fr: "Payer", pt: "Pagar" }),
            subtitle: insert(
                t({
                    en: "{{name}} · {{index}} of {{count}}",
                    es: "{{name}} · {{index}} de {{count}}",
                    fr: "{{name}} · {{index}} sur {{count}}",
                    pt: "{{name}} · {{index}} de {{count}}",
                })
            ),
            subtitleUpfront: insert(
                t({
                    en: "{{name}} · upfront",
                    es: "{{name}} · inicial",
                    fr: "{{name}} · acompte",
                    pt: "{{name}} · entrada",
                })
            ),
            title: insert(
                t({ en: "Pay {{account}}", es: "Pagar {{account}}", fr: "Payer {{account}}", pt: "Pagar {{account}}" })
            ),
        },
        paidOffCount: insert(
            t({ en: "{{count}} paid off", es: "{{count}} pagadas", fr: "{{count}} soldées", pt: "{{count}} quitadas" })
        ),
        plan: {
            each: insert(
                t({
                    en: "{{count}} × {{amount}}",
                    es: "{{count}} × {{amount}}",
                    fr: "{{count}} × {{amount}}",
                    pt: "{{count}} × {{amount}}",
                })
            ),
            mixed: insert(
                t({
                    en: "{{count}} installments",
                    es: "{{count}} cuotas",
                    fr: "{{count}} échéances",
                    pt: "{{count}} parcelas",
                })
            ),
            upfront: t({ en: "Upfront", es: "Inicial", fr: "Acompte", pt: "Entrada" }),
            withUpfront: insert(
                t({
                    en: "Upfront + {{rest}}",
                    es: "Inicial + {{rest}}",
                    fr: "Acompte + {{rest}}",
                    pt: "Entrada + {{rest}}",
                })
            ),
        },
        progress: insert(
            t({
                en: "{{paid}} of {{count}}",
                es: "{{paid}} de {{count}}",
                fr: "{{paid}} sur {{count}}",
                pt: "{{paid}} de {{count}}",
            })
        ),
        row: {
            installment: insert(
                t({
                    en: "Installment {{index}} of {{count}}",
                    es: "Cuota {{index}} de {{count}}",
                    fr: "Échéance {{index}} sur {{count}}",
                    pt: "Parcela {{index}} de {{count}}",
                })
            ),
            upfront: t({ en: "Upfront", es: "Inicial", fr: "Acompte", pt: "Entrada" }),
        },
        scan: {
            account: t({ en: "Account", es: "Cuenta", fr: "Compte", pt: "Conta" }),
            choose: t({
                en: "Choose screenshot",
                es: "Elegir captura",
                fr: "Choisir une capture",
                pt: "Escolher captura de tela",
            }),
            chooseAccount: t({
                en: "Choose account",
                es: "Elegir cuenta",
                fr: "Choisir le compte",
                pt: "Escolher conta",
            }),
            currency: insert(
                t({
                    en: "This plan is in {{plan}} and {{account}} is in {{currency}}.",
                    es: "Este plan está en {{plan}} y {{account}} está en {{currency}}.",
                    fr: "Cet échéancier est en {{plan}} et {{account}} en {{currency}}.",
                    pt: "Este plano está em {{plan}} e {{account}} está em {{currency}}.",
                })
            ),
            drop: t({
                en: "Drop it here or paste it",
                es: "Suéltala aquí o pégala",
                fr: "Déposez-la ici ou collez-la",
                pt: "Solte aqui ou cole",
            }),
            failed: {
                notConfigured: t({
                    en: "Importing a screenshot needs the cloud tier.",
                    es: "Para importar una captura se necesita el servicio en la nube.",
                    fr: "L'import d'une capture nécessite le service cloud.",
                    pt: "Importar uma captura de tela requer o serviço na nuvem.",
                }),
                notEntitled: t({
                    en: "Your free captures are used up. They come back within 30 days; Pro lifts the limit.",
                    es: "Ya usaste tus capturas gratis. Se renuevan en menos de 30 días; con Pro no tienes ese límite.",
                    fr: "Vos captures gratuites sont épuisées. Elles reviennent sous 30 jours ; Pro supprime la limite.",
                    pt: "Suas capturas grátis acabaram. Elas voltam em até 30 dias; o Pro remove o limite.",
                }),
                notImage: t({
                    en: "Couldn't open that image.",
                    es: "No pude abrir esa imagen.",
                    fr: "Impossible d'ouvrir cette image.",
                    pt: "Não consegui abrir essa imagem.",
                }),
                offline: t({
                    en: "You're offline.",
                    es: "Estás sin conexión.",
                    fr: "Vous êtes hors ligne.",
                    pt: "Você está sem conexão.",
                }),
                provider: t({
                    en: "Couldn't read the plan.",
                    es: "No pude leer el plan.",
                    fr: "Impossible de lire l'échéancier.",
                    pt: "Não consegui ler o plano.",
                }),
                quotaExceeded: t({
                    en: "The fair-use limit for captures is reached. It resets within 30 days.",
                    es: "Llegaste al límite de uso justo de capturas. Se renueva en menos de 30 días.",
                    fr: "La limite d'utilisation raisonnable des captures est atteinte. Elle se réinitialise sous 30 jours.",
                    pt: "Você atingiu o limite de uso justo de capturas. Ele se renova em até 30 dias.",
                }),
                rateLimited: t({
                    en: "That's a lot of screenshots at once. Give it a moment.",
                    es: "Son muchas capturas seguidas. Espera un momento.",
                    fr: "Beaucoup de captures d'un coup. Patientez un instant.",
                    pt: "São muitas capturas seguidas. Espere um momento.",
                }),
                unauthenticated: t({
                    en: "Sign in to import a screenshot.",
                    es: "Inicia sesión para importar una captura.",
                    fr: "Connectez-vous pour importer une capture.",
                    pt: "Entre para importar uma captura de tela.",
                }),
                unclear: t({
                    en: "Didn't find a payment plan in that image.",
                    es: "No encontré un plan de cuotas en esa imagen.",
                    fr: "Aucun échéancier trouvé dans cette image.",
                    pt: "Não encontrei um plano de parcelas nessa imagem.",
                }),
            },
            intro: t({
                en: "A screenshot of the order's payment plan.",
                es: "Una captura del plan de pagos de la orden.",
                fr: "Une capture d'écran de l'échéancier de la commande.",
                pt: "Uma captura de tela do plano de pagamento da compra.",
            }),
            noCard: t({
                en: "Add a card or loan to import its plan.",
                es: "Agrega una tarjeta o préstamo para importar su plan.",
                fr: "Ajoutez une carte ou un prêt pour importer son échéancier.",
                pt: "Adicione um cartão ou empréstimo para importar o plano.",
            }),
            reading: t({
                en: "Reading the plan…",
                es: "Leyendo el plan…",
                fr: "Lecture de l'échéancier…",
                pt: "Lendo o plano…",
            }),
            retry: t({ en: "Try again", es: "Reintentar", fr: "Réessayer", pt: "Tentar de novo" }),
            title: t({
                en: "Import from a screenshot",
                es: "Importar desde una captura",
                fr: "Importer depuis une capture d'écran",
                pt: "Importar de uma captura de tela",
            }),
        },
        status: {
            comingUp: t({ en: "Coming up", es: "Próxima", fr: "À venir", pt: "Próxima" }),
            inDays: insert(
                t({
                    en: "In {{count}} days",
                    es: "En {{count}} días",
                    fr: "Dans {{count}} jours",
                    pt: "Em {{count}} dias",
                })
            ),
            overdue: t({ en: "Overdue", es: "Vencida", fr: "En retard", pt: "Vencida" }),
            paid: t({ en: "Paid", es: "Pagada", fr: "Payée", pt: "Paga" }),
            partial: t({ en: "Partly paid", es: "Pago parcial", fr: "Payée en partie", pt: "Paga em parte" }),
            today: t({ en: "Today", es: "Hoy", fr: "Aujourd'hui", pt: "Hoje" }),
            tomorrow: t({ en: "Tomorrow", es: "Mañana", fr: "Demain", pt: "Amanhã" }),
        },
        tabs: {
            allAccounts: t({
                en: "All accounts",
                es: "Todas las cuentas",
                fr: "Tous les comptes",
                pt: "Todas as contas",
            }),
            orders: t({ en: "Orders", es: "Órdenes", fr: "Commandes", pt: "Compras" }),
            paidOff: t({ en: "Paid off", es: "Pagadas", fr: "Soldées", pt: "Quitadas" }),
        },
        title: t({ en: "Installments", es: "Cuotas", fr: "Paiements échelonnés", pt: "Parcelas" }),
    },
    key: "dashboard-installments",
} satisfies Dictionary;

export default dashboardInstallments;
