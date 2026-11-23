import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const profiles = {
    content: {
        "profiles.a11y.switch": t({
            en: "Switch profile",
            de: "Profil wechseln",
            es: "Cambiar de perfil",
            fr: "Changer de profil",
            pt: "Trocar de perfil",
        }),
        "profiles.create": t({
            en: "Create Profile",
            de: "Profil erstellen",
            es: "Crear perfil",
            fr: "Créer le profil",
            pt: "Criar perfil",
        }),
        "profiles.delete.body": t({
            en: "Its entries, accounts and budgets leave your devices. The synced copy stays until you delete your account.",
            de: "Seine Einträge, Konten und Budgets verschwinden von deinen Geräten. Die synchronisierte Kopie bleibt, bis du dein Konto löschst.",
            es: "Sus movimientos, cuentas y presupuestos salen de tus dispositivos. La copia sincronizada se queda hasta que elimines tu cuenta.",
            fr: "Ses opérations, comptes et budgets quittent vos appareils. La copie synchronisée reste jusqu'à la suppression de votre compte.",
            pt: "Os lançamentos, contas e orçamentos saem dos seus aparelhos. A cópia sincronizada fica até você excluir sua conta.",
            "pt-PT":
                "Os registos, contas e orçamentos saem dos seus dispositivos. A cópia sincronizada fica até eliminar a sua conta.",
        }),
        "profiles.delete.title": t({
            en: "Delete this profile?",
            de: "Dieses Profil löschen?",
            es: "¿Eliminar este perfil?",
            fr: "Supprimer ce profil ?",
            pt: "Apagar este perfil?",
        }),
        "profiles.edit": t({
            en: "Edit Profile",
            de: "Profil bearbeiten",
            es: "Editar perfil",
            fr: "Modifier le profil",
            pt: "Editar perfil",
        }),
        "profiles.error.saveFailed": t({
            en: "Couldn't save the profile. Try again.",
            de: "Das Profil konnte nicht gespeichert werden. Versuch es noch mal.",
            es: "No se pudo guardar el perfil. Inténtalo de nuevo.",
            fr: "Impossible d'enregistrer le profil. Réessayez.",
            pt: "Não foi possível salvar o perfil. Tente de novo.",
            "pt-PT": "Não foi possível guardar o perfil. Tente novamente.",
        }),
        "profiles.error.switchFailed": t({
            en: "Couldn't switch profiles. Try again.",
            de: "Das Profil konnte nicht gewechselt werden. Versuch es noch mal.",
            es: "No se pudo cambiar de perfil. Inténtalo de nuevo.",
            fr: "Impossible de changer de profil. Réessayez.",
            pt: "Não foi possível trocar de perfil. Tente de novo.",
            "pt-PT": "Não foi possível trocar de perfil. Tente novamente.",
        }),
        "profiles.field.currency": t({
            en: "Main currency",
            de: "Hauptwährung",
            es: "Moneda principal",
            fr: "Devise principale",
            pt: "Moeda principal",
        }),
        "profiles.field.name": t({
            en: "Name",
            de: "Name",
            es: "Nombre",
            fr: "Nom",
            pt: "Nome",
        }),
        "profiles.namePlaceholder": t({
            en: "Work",
            de: "Arbeit",
            es: "Trabajo",
            fr: "Travail",
            pt: "Trabalho",
        }),
        "profiles.new": t({
            en: "New Profile",
            de: "Neues Profil",
            es: "Nuevo perfil",
            fr: "Nouveau profil",
            pt: "Novo perfil",
        }),
        "profiles.personal": t({
            en: "Personal",
            de: "Privat",
            es: "Personal",
            fr: "Personnel",
            pt: "Pessoal",
        }),
        "profiles.title": t({
            en: "Profiles",
            de: "Profile",
            es: "Perfiles",
            fr: "Profils",
            pt: "Perfis",
        }),
    },
    key: "profiles" as const,
} satisfies Dictionary;

export default profiles;
