import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const pro = {
    content: {
        "pro.a11y.row": t({
            en: "{feature}. Free: {free}. Pro: {pro}.",
            es: "{feature}. Gratis: {free}. Pro: {pro}.",
            pt: "{feature}. Grátis: {free}. Pro: {pro}.",
        }),
        "pro.action.see": t({
            en: "See Outlayr Pro",
            es: "Ver Outlayr Pro",
            pt: "Ver o Outlayr Pro",
        }),
        "pro.alreadyActive": t({
            en: "Pro is active on this store account.",
            es: "Ya tienes Pro activo en esta cuenta de la tienda.",
            pt: "O Pro já está ativo nesta conta da loja.",
        }),
        "pro.checking": t({
            en: "Checking…",
            es: "Comprobando…",
            pt: "Verificando…",
        }),
        "pro.col.free": t({
            en: "Free",
            es: "Gratis",
            pt: "Grátis",
        }),
        "pro.col.pro": t({
            en: "Pro",
            es: "Pro",
            pt: "Pro",
        }),
        "pro.cta.buy": t({
            en: "Get Pro for {price}",
            es: "Obtén Pro por {price}",
            pt: "Comprar o Pro por {price}",
        }),
        "pro.cta.buyMonthly": t({
            en: "Get Pro for {price}/month",
            es: "Obtén Pro por {price}/mes",
            pt: "Assinar o Pro por {price}/mês",
        }),
        "pro.cta.buyYearly": t({
            en: "Get Pro for {price}/year",
            es: "Obtén Pro por {price}/año",
            pt: "Assinar o Pro por {price}/ano",
        }),
        "pro.cta.continue": t({
            en: "Continue",
            es: "Continuar",
            pt: "Continuar",
        }),
        "pro.cta.start": t({
            en: "Start {days} days free",
            es: "Prueba {days} días gratis",
            pt: "Testar grátis por {days} dias",
        }),
        "pro.cta.then": t({
            en: "then {price}",
            es: "luego {price}",
            pt: "depois {price}",
        }),
        "pro.cta.thenMonthly": t({
            en: "then {price}/month",
            es: "luego {price}/mes",
            pt: "depois {price}/mês",
        }),
        "pro.cta.thenYearly": t({
            en: "then {price}/year",
            es: "luego {price}/año",
            pt: "depois {price}/ano",
        }),
        "pro.cta.unlocking": t({
            en: "Unlocking Pro…",
            es: "Activando Pro…",
            pt: "Desbloqueando o Pro…",
        }),
        "pro.entry.title": t({
            en: "Outlayr Pro",
            es: "Outlayr Pro",
            pt: "Outlayr Pro",
        }),
        "pro.entry.value": t({
            en: "Free plan",
            es: "Plan gratis",
            pt: "Plano grátis",
        }),
        "pro.entry.valuePro": t({
            en: "Active",
            es: "Activo",
            pt: "Ativo",
        }),
        "pro.eyebrow": t({
            en: "Outlayr Pro",
            es: "Outlayr Pro",
            pt: "Outlayr Pro",
        }),
        "pro.failedBody": t({
            en: "The purchase did not finish. If the store charged you, Restore will unlock Pro.",
            es: "La compra no se completó. Si la tienda te cobró, toca Restaurar para activar Pro.",
            pt: "A compra não foi concluída. Se a loja cobrou, toque em Restaurar para desbloquear o Pro.",
        }),
        "pro.legal.privacy": t({
            en: "Privacy",
            es: "Privacidad",
            pt: "Privacidade",
        }),
        "pro.legal.restore": t({
            en: "Restore",
            es: "Restaurar",
            pt: "Restaurar",
        }),
        "pro.legal.restoring": t({
            en: "Restoring…",
            es: "Restaurando…",
            pt: "Restaurando…",
        }),
        "pro.legal.terms": t({
            en: "Terms",
            es: "Términos",
            pt: "Termos",
        }),
        "pro.needsAccount": t({
            en: "Sign in before buying Pro, so the purchase follows your ledger to every device.",
            es: "Inicia sesión antes de comprar Pro para que la compra te acompañe en todos tus dispositivos.",
            pt: "Entre antes de comprar o Pro, para que a compra acompanhe seus lançamentos em todos os dispositivos.",
        }),
        "pro.needsCloud": t({
            en: "This build has no Outlayr account service, so most of Pro has nowhere to run. Nothing is for sale here.",
            es: "Esta versión no tiene el servicio de cuentas de Outlayr, así que la mayor parte de Pro no tiene dónde funcionar. Aquí no hay nada en venta.",
            pt: "Esta versão não tem o serviço de contas do Outlayr, então a maior parte do Pro não tem onde funcionar. Nada está à venda aqui.",
        }),
        "pro.nothingRestoredBody": t({
            en: "Nothing restored an active Pro on this store account.",
            es: "No encontramos Pro activo en esta cuenta de la tienda.",
            pt: "Não encontramos um Pro ativo nesta conta da loja.",
        }),
        "pro.plan.annual": t({
            en: "Yearly",
            es: "Anual",
            pt: "Anual",
        }),
        "pro.plan.bestValue": t({
            en: "Best value",
            es: "Mejor precio",
            pt: "Melhor preço",
        }),
        "pro.plan.lifetime": t({
            en: "Lifetime",
            es: "De por vida",
            pt: "Vitalício",
        }),
        "pro.plan.loading": t({
            en: "Loading plans…",
            es: "Cargando planes…",
            pt: "Carregando planos…",
        }),
        "pro.plan.monthly": t({
            en: "Monthly",
            es: "Mensual",
            pt: "Mensal",
        }),
        "pro.plan.once": t({
            en: "once",
            es: "pago único",
            pt: "pagamento único",
        }),
        "pro.plan.perMonth": t({
            en: "{price} / mo",
            es: "{price} / mes",
            pt: "{price} / mês",
        }),
        "pro.plan.perMonthBare": t({
            en: "/ mo",
            es: "/ mes",
            pt: "/ mês",
        }),
        "pro.plan.save": t({
            en: "Save {percent}%",
            es: "Ahorra {percent}%",
            pt: "Economize {percent}%",
        }),
        "pro.plan.trial": t({
            en: "{days} days free",
            es: "{days} días gratis",
            pt: "{days} dias grátis",
        }),
        "pro.play.manage": t({
            en: "Manage subscription",
            es: "Gestionar suscripción",
            pt: "Gerenciar assinatura",
        }),
        "pro.play.renews": t({
            en: "Subscriptions renew automatically until you cancel them. Cancel anytime in Google Play.",
            es: "Las suscripciones se renuevan automáticamente hasta que las canceles. Cancélalas cuando quieras en Google Play.",
            pt: "As assinaturas são renovadas automaticamente até você cancelar. Cancele quando quiser no Google Play.",
        }),
        "pro.play.trial": t({
            en: "When the free trial ends it becomes a paid subscription, unless you cancel before then.",
            es: "Cuando termine la prueba gratuita, pasará a ser una suscripción de pago, salvo que la canceles antes.",
            pt: "Quando o teste grátis terminar, ele vira uma assinatura paga, a menos que você cancele antes.",
        }),
        "pro.restoreFailedBody": t({
            en: "The restore could not be completed. Check the connection and try again.",
            es: "No se pudo completar la restauración. Revisa la conexión e inténtalo de nuevo.",
            pt: "Não foi possível concluir a restauração. Verifique a conexão e tente de novo.",
        }),
        "pro.restorePendingBody": t({
            en: "Pro was restored, but the server has not confirmed it yet. Try again in a moment.",
            es: "Pro se restauró, pero el servidor aún no lo confirma. Inténtalo de nuevo en un momento.",
            pt: "O Pro foi restaurado, mas o servidor ainda não confirmou. Tente de novo em instantes.",
        }),
        "pro.retry": t({
            en: "Try again",
            es: "Intentar de nuevo",
            pt: "Tentar de novo",
        }),
        "pro.row.accounts": t({
            en: "Accounts",
            es: "Cuentas",
            pt: "Contas",
        }),
        "pro.row.budgets": t({
            en: "Category budgets",
            es: "Presupuestos por categoría",
            pt: "Orçamentos por categoria",
        }),
        "pro.row.captures": t({
            en: "Captures / 30 days",
            es: "Capturas / 30 días",
            pt: "Capturas / 30 dias",
        }),
        "pro.row.currencies": t({
            en: "Account currencies",
            es: "Monedas de cuentas",
            pt: "Moedas das contas",
        }),
        "pro.row.devices": t({
            en: "Sync across devices",
            es: "Sincronizar dispositivos",
            pt: "Sincronizar dispositivos",
        }),
        "pro.row.icons": t({
            en: "App icons",
            es: "Íconos de la app",
            pt: "Ícones do app",
        }),
        "pro.row.import": t({
            en: "AI matching on import",
            es: "Coincidencia con IA al importar",
            pt: "IA ao importar",
        }),
        "pro.row.installmentApps": t({
            en: "Installment apps",
            es: "Apps de cuotas",
            pt: "Apps de parcelamento",
        }),
        "pro.row.payoffPlans": t({
            en: "Payoff plans",
            es: "Planes de pago",
            pt: "Planos de quitação",
        }),
        "pro.row.lookup": t({
            en: "Web merchant lookup",
            es: "Búsqueda web de comercios",
            pt: "Busca de estabelecimentos na web",
        }),
        "pro.row.photos": t({
            en: "Receipt photo backup",
            es: "Respaldo de fotos",
            pt: "Backup de fotos",
        }),
        "pro.syncPendingBody": t({
            en: "The purchase went through, but the server has not confirmed it yet. Try again in a moment.",
            es: "La compra se completó, pero el servidor aún no la confirma. Inténtalo de nuevo en un momento.",
            pt: "A compra foi concluída, mas o servidor ainda não confirmou. Tente de novo em instantes.",
        }),
        "pro.title": t({
            en: "What upgrading changes",
            es: "Qué ganas con Pro",
            pt: "O que muda com o Pro",
        }),
        "pro.unavailable": t({
            en: "Plans are not available right now.",
            es: "Los planes no están disponibles ahora.",
            pt: "Os planos não estão disponíveis agora.",
        }),
        "pro.unconfirmed": t({
            en: "Pro is active on this store account, but the server has not confirmed it, so syncing and the AI features stay off until it does.",
            es: "Pro está activo en esta cuenta de la tienda, pero el servidor aún no lo confirma, así que la sincronización y las funciones con IA siguen desactivadas hasta entonces.",
            pt: "O Pro está ativo nesta conta da loja, mas o servidor ainda não confirmou, então a sincronização e os recursos de IA ficam desativados até lá.",
        }),
        "pro.unentitledBody": t({
            en: "The purchase completed but Pro did not unlock. Try Restore, and write to support if it stays locked.",
            es: "La compra se completó, pero Pro no se activó. Toca Restaurar y, si sigue sin activarse, escríbenos a soporte.",
            pt: "A compra foi concluída, mas o Pro não foi desbloqueado. Toque em Restaurar e, se continuar bloqueado, fale com o suporte.",
        }),
        "pro.value.off": t({
            en: "off",
            es: "no",
            pt: "não",
        }),
        "pro.value.on": t({
            en: "on",
            es: "sí",
            pt: "sim",
        }),
        "pro.value.unlimited": t({
            en: "unlimited",
            es: "sin límite",
            pt: "sem limite",
        }),
        "pro.value.web": t({
            en: "web",
            es: "web",
            pt: "web",
        }),
    },
    key: "pro" as const,
} satisfies Dictionary;

export default pro;
