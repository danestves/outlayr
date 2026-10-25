import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const voice = {
    content: {
        "voice.action.edit": t({
            en: "Edit",
            es: "Editar",
            pt: "Editar",
        }),
        "voice.action.finish": t({
            en: "Finish in the form",
            es: "Terminar en el formulario",
            pt: "Terminar no formulário",
        }),
        "voice.action.fix": t({
            en: "Fix it",
            es: "Corregir",
            pt: "Corrigir",
        }),
        "voice.action.retry": t({
            en: "Say it again",
            es: "Dilo de nuevo",
            pt: "Diga de novo",
        }),
        "voice.action.save": t({
            en: "Save",
            es: "Guardar",
            pt: "Salvar",
            "pt-PT": "Guardar",
        }),
        "voice.action.settings": t({
            en: "Open Settings",
            es: "Abrir Configuración",
            "es-ES": "Abrir Ajustes",
            pt: "Abrir Ajustes",
            "pt-PT": "Abrir Definições",
        }),
        "voice.close": t({
            en: "Close",
            es: "Cerrar",
            pt: "Fechar",
        }),
        "voice.failed.denied": t({
            en: "Outlayr needs the microphone to hear you.",
            es: "Outlayr necesita el micrófono para escucharte.",
            pt: "O Outlayr precisa do microfone para ouvir você.",
            "pt-PT": "O Outlayr precisa do microfone para ouvir o que diz.",
        }),
        "voice.failed.notConfigured": t({
            en: "Speaking an entry needs the cloud tier.",
            es: "Para dictar un registro se necesita el servicio en la nube.",
            pt: "Ditar um lançamento requer o serviço na nuvem.",
            "pt-PT": "Ditar um registo requer o serviço na nuvem.",
        }),
        "voice.failed.notEntitled": t({
            en: "Your free captures, voice and receipts together, are used up. They come back within 30 days; Pro lifts the limit.",
            es: "Ya usaste tus capturas gratis (voz y recibos). Se renuevan en menos de 30 días; con Pro no tienes ese límite.",
            "es-ES":
                "Ya has usado tus capturas gratis (voz y tickets). Se renuevan en menos de 30 días; con Pro no tienes ese límite.",
            pt: "Você já usou suas capturas grátis (voz e recibos). Elas se renovam em até 30 dias; com o Pro não há esse limite.",
            "pt-PT":
                "Já usou as suas capturas grátis (voz e talões). Renovam-se no prazo de 30 dias; com o Pro não há este limite.",
        }),
        "voice.failed.offline": t({
            en: "You're offline.",
            es: "Estás sin conexión.",
            pt: "Você está sem conexão.",
            "pt-PT": "Está sem ligação.",
        }),
        "voice.failed.provider": t({
            en: "Couldn't write that down.",
            es: "No pude anotarlo.",
            pt: "Não consegui anotar isso.",
        }),
        "voice.failed.quotaExceeded": t({
            en: "The fair-use limit for captures is reached. It resets within 30 days.",
            es: "Llegaste al límite de uso justo de capturas. Se renueva en menos de 30 días.",
            "es-ES": "Has llegado al límite de uso justo de capturas. Se renueva en menos de 30 días.",
            pt: "Você atingiu o limite de uso justo de capturas. Ele se renova em até 30 dias.",
            "pt-PT": "Atingiu o limite de utilização justa de capturas. Renova-se no prazo de 30 dias.",
        }),
        "voice.failed.rateLimited": t({
            en: "That's a lot of entries at once. Give it a moment.",
            es: "Son muchos registros seguidos. Espera un momento.",
            pt: "São muitos lançamentos seguidos. Espere um momento.",
            "pt-PT": "São muitos registos seguidos. Espere um momento.",
        }),
        "voice.failed.silent": t({
            en: "Didn't hear anything.",
            es: "No escuché nada.",
            pt: "Não ouvi nada.",
        }),
        "voice.failed.timeout": t({
            en: "That took too long.",
            es: "Tardó demasiado.",
            pt: "Demorou demais.",
            "pt-PT": "Demorou demasiado.",
        }),
        "voice.failed.unauthenticated": t({
            en: "Sign in to speak an entry.",
            es: "Inicia sesión para dictar un registro.",
            pt: "Entre para ditar um lançamento.",
            "pt-PT": "Inicie sessão para ditar um registo.",
        }),
        "voice.failed.unclear": t({
            en: "Didn't catch a transaction in that.",
            es: "No detecté ninguna transacción ahí.",
            pt: "Não identifiquei nenhum lançamento aí.",
            "pt-PT": "Não identifiquei nenhum registo no que disse.",
        }),
        "voice.hint": t({
            en: "Try “{example}”",
            es: "Prueba “{example}”",
            pt: "Experimente “{example}”",
        }),
        "voice.hint.example": t({
            en: "{amount} at {merchant} today",
            es: "{amount} en {merchant} hoy",
            pt: "{amount} em {merchant} hoje",
        }),
        "voice.hint.exampleAccount": t({
            en: "{amount} at {merchant} today on {account}",
            es: "{amount} en {merchant} hoy con {account}",
            pt: "{amount} em {merchant} hoje com {account}",
        }),
        "voice.hint.fallback": t({
            en: "12 for lunch today",
            es: "12 de almuerzo hoy",
            pt: "12 no almoço hoje",
        }),
        "voice.limit.last": t({
            en: "Last clip for now",
            es: "Última grabación por ahora",
            pt: "Última gravação por enquanto",
        }),
        "voice.limit.next": t({
            en: "Next clip in {time}",
            es: "Siguiente grabación en {time}",
            pt: "Próxima gravação em {time}",
        }),
        "voice.limit.paused": t({
            en: "Voice is paused",
            es: "La voz está en pausa",
            pt: "A voz está pausada",
        }),
        "voice.mic.finish": t({
            en: "Done speaking",
            es: "Terminé de hablar",
            pt: "Terminei de falar",
        }),
        // The review reads as one line: "$12.50 at Starbucks · Coffee · yesterday".
        "voice.review.at": t({
            en: "at",
            es: "en",
            pt: "em",
        }),
        "voice.review.from": t({
            en: "from",
            es: "de",
            pt: "de",
        }),
        "voice.review.noAccount": t({
            en: "Which account?",
            es: "¿Qué cuenta?",
            pt: "Qual conta?",
        }),
        "voice.review.noCategory": t({
            en: "No category yet",
            es: "Aún sin categoría",
            pt: "Ainda sem categoria",
        }),
        "voice.review.noMerchant": t({
            en: "No name yet",
            es: "Aún sin nombre",
            pt: "Ainda sem nome",
        }),
        "voice.review.transfer": t({
            en: "{from} to {to}",
            es: "{from} a {to}",
            pt: "{from} para {to}",
        }),
        "voice.review.transferLabel": t({
            en: "Transfer",
            es: "Transferencia",
            pt: "Transferência",
        }),
        "voice.state.listening": t({
            en: "Listening…",
            es: "Escuchando…",
            pt: "Ouvindo…",
            "pt-PT": "A ouvir…",
        }),
        "voice.state.starting": t({
            en: "Getting ready…",
            es: "Preparando…",
            pt: "Preparando…",
            "pt-PT": "A preparar…",
        }),
        "voice.state.thinking": t({
            en: "Writing it down…",
            es: "Anotando…",
            pt: "Anotando…",
            "pt-PT": "A anotar…",
        }),
        "voice.turn.field.account": t({
            en: "account",
            es: "cuenta",
            pt: "conta",
        }),
        "voice.turn.field.amount": t({
            en: "amount",
            es: "monto",
            "es-ES": "importe",
            pt: "valor",
        }),
        "voice.turn.field.category": t({
            en: "category",
            es: "categoría",
            pt: "categoria",
        }),
        "voice.turn.field.date": t({
            en: "date",
            es: "fecha",
            pt: "data",
        }),
        "voice.turn.field.details": t({
            en: "details",
            es: "detalles",
            pt: "detalhes",
        }),
        "voice.turn.field.kind": t({
            en: "kind",
            es: "tipo",
            pt: "tipo",
        }),
        "voice.turn.field.merchant": t({
            en: "name",
            es: "nombre",
            pt: "nome",
        }),
        "voice.turn.field.schedule": t({
            en: "schedule",
            es: "frecuencia",
            pt: "recorrência",
        }),
        "voice.turn.unchanged": t({
            en: "Same as before",
            es: "Igual que antes",
            pt: "Sem alterações",
        }),
        "voice.turn.updated": t({
            en: "Updated",
            es: "Actualizado",
            pt: "Atualizado",
        }),
    },
    key: "voice" as const,
} satisfies Dictionary;

export default voice;
