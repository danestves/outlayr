import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsAccount = {
    content: {
        "settings.account.checking": t({
            en: "Checking\u2026",
            es: "Verificando…",
            pt: "Verificando…",
        }),
        "settings.account.delete": t({
            en: "Delete account",
            es: "Eliminar cuenta",
            pt: "Apagar conta",
        }),
        "settings.account.deleteConfirm": t({
            en: "Delete",
            es: "Eliminar",
            pt: "Apagar",
        }),
        "settings.account.deleteConfirmBody": t({
            en: "Your account and everything synced to it are removed for good. The ledger on this device is not touched.",
            es: "Tu cuenta y todo lo sincronizado en ella se eliminan de forma definitiva. El registro de este dispositivo no se toca.",
            pt: "Sua conta e tudo o que foi sincronizado com ela são apagados para sempre. Os lançamentos deste dispositivo não são afetados.",
        }),
        "settings.account.deleteConfirmTitle": t({
            en: "Delete this account?",
            es: "¿Eliminar esta cuenta?",
            pt: "Apagar esta conta?",
        }),
        "settings.account.deleteFooter": t({
            en: "Deletes your account and everything synced to it. The ledger on this device stays, and signing in again adopts it.",
            es: "Elimina tu cuenta y todo lo sincronizado en ella. El registro de este dispositivo se conserva y, si vuelves a iniciar sesión, se suma a tu cuenta.",
            pt: "Apaga sua conta e tudo o que foi sincronizado com ela. Os lançamentos deste dispositivo ficam e, se você entrar de novo, passam para a sua conta.",
        }),
        "settings.account.deleteSection": t({
            en: "Deleting your account",
            es: "Eliminar tu cuenta",
            pt: "Apagar sua conta",
        }),
        "settings.account.deleting": t({
            en: "Deleting…",
            es: "Eliminando…",
            pt: "Apagando…",
        }),
        "settings.account.eraseDevice": t({
            en: "Delete account and erase this device",
            es: "Eliminar cuenta y borrar este dispositivo",
            pt: "Apagar conta e este dispositivo",
        }),
        "settings.account.eraseDeviceConfirm": t({
            en: "Erase device",
            es: "Borrar dispositivo",
            pt: "Apagar dispositivo",
        }),
        "settings.account.eraseDeviceConfirmBody": t({
            en: "This permanently removes your account and all erasable Outlayr data on this device.",
            es: "Esto elimina de forma permanente tu cuenta y todos los datos borrables de Outlayr en este dispositivo.",
            pt: "Isso remove para sempre sua conta e todos os dados apagáveis do Outlayr neste dispositivo.",
        }),
        "settings.account.eraseDeviceConfirmTitle": t({
            en: "Erase this device too?",
            es: "¿Borrar también este dispositivo?",
            pt: "Apagar este dispositivo também?",
        }),
        "settings.account.eraseDeviceFooter": t({
            en: "Erases Outlayr data on this device after your cloud account is deleted. System permissions and widget placement remain controlled by the OS.",
            es: "Borra los datos de Outlayr de este dispositivo después de eliminar tu cuenta en la nube. Los permisos del sistema y la ubicación de los widgets siguen bajo control del sistema operativo.",
            pt: "Apaga os dados do Outlayr deste dispositivo depois que sua conta na nuvem for apagada. As permissões do sistema e a posição dos widgets continuam sob controle do sistema operacional.",
        }),
        "settings.account.eraseDeviceSection": t({
            en: "Erase this device",
            es: "Borrar este dispositivo",
            pt: "Apagar este dispositivo",
        }),
        "settings.account.eyebrow": t({
            en: "Account",
            es: "Cuenta",
            pt: "Conta",
        }),
        "settings.account.genericFailure": t({
            en: "Sign-in didn't complete. Your ledger on this device is untouched.",
            es: "El inicio de sesi\u00F3n no se complet\u00F3. Tu registro en este dispositivo est\u00E1 intacto.",
            pt: "Não foi possível entrar. Seus lançamentos neste dispositivo estão intactos.",
        }),
        "settings.account.notSignedIn": t({
            en: "Not signed in",
            es: "No has iniciado sesión",
            pt: "Sessão não iniciada",
        }),
        "settings.account.playServices": t({
            en: "Google Play services are unavailable on this device.",
            es: "Los servicios de Google Play no est\u00E1n disponibles en este dispositivo.",
            pt: "Os serviços do Google Play não estão disponíveis neste dispositivo.",
        }),
        "settings.account.resetFailedTitle": t({
            en: "Device cleanup needs attention",
            es: "La limpieza del dispositivo necesita atención",
            pt: "A limpeza do dispositivo precisa de atenção",
        }),
        "settings.account.rowTitle": t({
            en: "Account",
            es: "Cuenta",
            pt: "Conta",
        }),
        "settings.account.sectionTitle": t({
            en: "Account",
            es: "Cuenta",
            pt: "Conta",
        }),
        "settings.account.signIn": t({
            en: "Sign in",
            es: "Iniciar sesión",
            pt: "Entrar",
        }),
        "settings.account.signInFooter": t({
            en: "Signing in does not change your ledger. It lets you choose whether to sync this device with your account.",
            es: "Iniciar sesión no cambia tu registro. Te permite elegir si quieres sincronizar este dispositivo con tu cuenta.",
            pt: "Entrar não muda seus lançamentos. Só permite escolher se você quer sincronizar este dispositivo com sua conta.",
        }),
        "settings.account.signInSection": t({
            en: "Sign in",
            es: "Iniciar sesi\u00F3n",
            pt: "Entrar",
        }),
        "settings.account.signOut": t({
            en: "Sign Out",
            es: "Cerrar sesi\u00F3n",
            pt: "Sair",
        }),
        "settings.account.signOutFooter": t({
            en: "Signing out ends the session on this phone. Every transaction, budget and category stays exactly where it is.",
            es: "Cerrar sesión solo afecta a este celular. Tus transacciones, presupuestos y categorías se quedan tal como están.",
            pt: "Sair encerra a sessão neste celular. Cada lançamento, orçamento e categoria continua exatamente onde está.",
        }),
        "settings.account.signedInAs": t({
            en: "Signed in as",
            es: "Sesi\u00F3n iniciada como",
            pt: "Sessão iniciada como",
        }),
        "settings.account.signedInFallback": t({
            en: "Signed in",
            es: "Sesi\u00F3n iniciada",
            pt: "Sessão iniciada",
        }),
        "settings.account.signedOutDetail": t({
            en: "Outlayr keeps your ledger on this device and behaves exactly the same signed out. An account lets you choose to sync it with your other devices.",
            es: "Outlayr guarda tu registro en este dispositivo y funciona igual sin sesión. Con una cuenta, puedes sincronizarlo con tus otros dispositivos si quieres.",
            pt: "O Outlayr mantém seus lançamentos neste dispositivo e funciona do mesmo jeito sem sessão iniciada. Com uma conta, você pode sincronizá-los com seus outros dispositivos, se quiser.",
        }),
        "settings.account.signingOut": t({
            en: "Signing out\u2026",
            es: "Cerrando sesi\u00F3n\u2026",
            pt: "Saindo…",
        }),
        "settings.account.unavailable": t({
            en: "Cloud features unavailable",
            es: "Funciones en la nube no disponibles",
            pt: "Recursos na nuvem indisponíveis",
        }),
        "settings.account.unavailableDetail": t({
            en: "This build is not configured for cloud features. Your ledger remains available on this device.",
            es: "Esta compilaci\u00F3n no est\u00E1 configurada para funciones en la nube. Tu registro sigue disponible en este dispositivo.",
            pt: "Esta versão não está configurada para recursos na nuvem. Seus lançamentos continuam disponíveis neste dispositivo.",
        }),
        "settings.sync.eyebrow": t({
            en: "This device",
            es: "Este dispositivo",
            pt: "Este dispositivo",
        }),
        "settings.sync.failedBody": t({
            en: "The switch is where it was and your ledger is untouched. Try again in a moment.",
            es: "El interruptor sigue como estaba y tu registro está intacto. Inténtalo de nuevo en un momento.",
            pt: "O botão continua como estava e seus lançamentos estão intactos. Tente de novo em instantes.",
        }),
        "settings.sync.failedTitle": t({
            en: "Sync setting unchanged",
            es: "La sincronización no cambió",
            pt: "A sincronização não mudou",
        }),
        "settings.sync.footer": t({
            en: "Turning sync off keeps every transaction, budget and category on this phone; it only stops queueing them for your account. Turning it back on hands over everything logged in between.",
            es: "Si desactivas la sincronización, cada transacción, presupuesto y categoría se queda en este celular; solo deja de enviarse a tu cuenta. Al activarla de nuevo, se envía todo lo que registraste mientras tanto.",
            pt: "Desativar a sincronização mantém cada lançamento, orçamento e categoria neste celular; só deixa de enviá-los para sua conta. Ao ativar de novo, tudo o que você registrou nesse meio-tempo é enviado.",
        }),
        "settings.sync.lastSynced": t({
            en: "Last synced",
            es: "Última sincronización",
            pt: "Última sincronização",
        }),
        "settings.sync.navTitle": t({
            en: "Sync",
            es: "Sincronización",
            pt: "Sincronização",
        }),
        "settings.sync.needsAccount": t({
            en: "Sync needs an account to replicate to. Until you sign in your ledger stays on this device, which is all Outlayr ever needed to work.",
            es: "Para sincronizar necesitas una cuenta. Hasta que inicies sesión, tu registro se queda en este dispositivo, y eso es todo lo que Outlayr necesita para funcionar.",
            pt: "Para sincronizar, você precisa de uma conta. Até você entrar, seus lançamentos ficam neste dispositivo, e é só disso que o Outlayr precisa para funcionar.",
        }),
        "settings.sync.never": t({
            en: "Not synced yet",
            es: "Aún sin sincronizar",
            pt: "Ainda não sincronizado",
        }),
        "settings.sync.neverSynced": t({
            en: "Never",
            es: "Nunca",
            pt: "Nunca",
        }),
        "settings.sync.off": t({
            en: "Not syncing",
            es: "Sin sincronizar",
            pt: "Sem sincronizar",
        }),
        "settings.sync.offDetail": t({
            en: "Nothing leaves this phone. Your ledger is complete here and works exactly as it does now.",
            es: "Nada sale de este celular. Tu registro está completo aquí y funciona igual que ahora.",
            pt: "Nada sai deste celular. Seus lançamentos estão completos aqui e funcionam exatamente como agora.",
        }),
        "settings.sync.on": t({
            en: "Syncing",
            es: "Sincronizando",
            pt: "Sincronizando",
        }),
        "settings.sync.onDetail": t({
            en: "Every change you make here is queued for your account and reaches your other devices.",
            es: "Cada cambio que haces aquí se pone en cola para tu cuenta y llega a tus otros dispositivos.",
            pt: "Cada mudança que você faz aqui entra na fila da sua conta e chega aos seus outros dispositivos.",
        }),
        "settings.sync.paused": t({
            en: "Paused",
            es: "En pausa",
            pt: "Em pausa",
        }),
        "settings.sync.pausedDetail": t({
            en: "Syncing needs Outlayr Pro. Your ledger is complete on this phone and keeps working; changes wait here until Pro is active again.",
            es: "Sincronizar requiere Outlayr Pro. Tu registro está completo en este celular y sigue funcionando; los cambios esperan aquí hasta que Pro esté activo otra vez.",
            pt: "Sincronizar requer o Outlayr Pro. Seus lançamentos estão completos neste celular e continuam funcionando; as mudanças esperam aqui até o Pro estar ativo de novo.",
        }),
        "settings.sync.pending": t({
            en: "{count} waiting to sync",
            es: "{count} por sincronizar",
            pt: "{count} aguardando sincronização",
        }),
        "settings.sync.pendingOne": t({
            en: "1 waiting to sync",
            es: "1 por sincronizar",
            pt: "1 aguardando sincronização",
        }),
        "settings.sync.section": t({
            en: "Replication",
            es: "Replicación",
            pt: "Replicação",
        }),
        "settings.sync.statusSection": t({
            en: "Status",
            es: "Estado",
            pt: "Status",
        }),
        "settings.sync.toggle": t({
            en: "Sync this device",
            es: "Sincronizar este dispositivo",
            pt: "Sincronizar este dispositivo",
        }),
        "settings.sync.upToDate": t({
            en: "Up to date",
            es: "Al día",
            pt: "Em dia",
        }),
        "settings.sync.waiting": t({
            en: "Waiting to sync",
            es: "Por sincronizar",
            pt: "Aguardando sincronização",
        }),
        "settings.sync.working": t({
            en: "Working…",
            es: "Procesando…",
            pt: "Processando…",
        }),
        "settings.usage.captures": t({
            en: "of {count} captures",
            es: "de {count} capturas",
            pt: "de {count} capturas",
        }),
        "settings.usage.capturesKinds": t({
            en: "Voice and receipts",
            es: "Voz y recibos",
            pt: "Voz e recibos",
        }),
        "settings.usage.fullIn": t({
            en: "Full in {time}",
            es: "Se recarga en {time}",
            pt: "Recarrega em {time}",
        }),
        "settings.usage.imports": t({
            en: "CSV imports",
            es: "Importaciones CSV",
            pt: "Importações de CSV",
        }),
        "settings.usage.left": t({
            en: "{count} left",
            es: "Quedan {count}",
            pt: "Restam {count}",
        }),
        "settings.usage.receipts": t({
            en: "Receipt scans",
            es: "Escaneos de recibos",
            pt: "Escaneamento de recibos",
        }),
        "settings.usage.resets": t({
            en: "Resets {date}",
            es: "Se reinicia el {date}",
            pt: "Renova em {date}",
        }),
        "settings.usage.suggestions": t({
            en: "Suggestions",
            es: "Sugerencias",
            pt: "Sugestões",
        }),
        "settings.usage.thisHour": t({
            en: "This hour",
            es: "En esta hora",
            pt: "Nesta hora",
        }),
        "settings.usage.toast.empty": t({
            en: "No captures left",
            es: "No te quedan capturas",
            pt: "Suas capturas acabaram",
        }),
        "settings.usage.toast.last": t({
            en: "That was your last capture",
            es: "Esa fue tu última captura",
            pt: "Essa foi sua última captura",
        }),
        "settings.usage.toast.moreOn": t({
            en: "{count} more on {date}",
            es: "{count} más el {date}",
            pt: "Mais {count} em {date}",
        }),
        "settings.usage.toast.pro": t({
            en: "Pro",
            es: "Pro",
            pt: "Pro",
        }),
        "settings.usage.toast.usage": t({
            en: "Usage",
            es: "Uso",
            pt: "Uso",
        }),
        "settings.usage.voice": t({
            en: "Voice",
            es: "Voz",
            pt: "Voz",
        }),
    },
    key: "settings-account" as const,
} satisfies Dictionary;

export default settingsAccount;
