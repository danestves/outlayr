import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const profiles = {
    content: {
        "profiles.a11y.switch": t({
            en: "Switch profile",
            es: "Cambiar de perfil",
            fr: "Changer de profil",
            pt: "Trocar de perfil",
        }),
        "profiles.create": t({
            en: "Create Profile",
            es: "Crear perfil",
            fr: "Créer le profil",
            pt: "Criar perfil",
        }),
        "profiles.delete.body": t({
            en: "Its entries, accounts and budgets are deleted. This can't be undone.",
            es: "Se eliminan sus movimientos, cuentas y presupuestos. No se puede deshacer.",
            fr: "Ses opérations, comptes et budgets sont supprimés. C'est irréversible.",
            pt: "Os lançamentos, contas e orçamentos são apagados. Não dá para desfazer.",
            "pt-PT": "Os registos, contas e orçamentos são apagados. Não é possível anular.",
        }),
        "profiles.delete.title": t({
            en: "Delete this profile?",
            es: "¿Eliminar este perfil?",
            fr: "Supprimer ce profil ?",
            pt: "Apagar este perfil?",
        }),
        "profiles.edit": t({
            en: "Edit Profile",
            es: "Editar perfil",
            fr: "Modifier le profil",
            pt: "Editar perfil",
        }),
        "profiles.error.saveFailed": t({
            en: "Couldn't save the profile. Try again.",
            es: "No se pudo guardar el perfil. Inténtalo de nuevo.",
            fr: "Impossible d'enregistrer le profil. Réessayez.",
            pt: "Não foi possível salvar o perfil. Tente de novo.",
            "pt-PT": "Não foi possível guardar o perfil. Tente novamente.",
        }),
        "profiles.field.currency": t({
            en: "Main currency",
            es: "Moneda principal",
            fr: "Devise principale",
            pt: "Moeda principal",
        }),
        "profiles.field.name": t({
            en: "Name",
            es: "Nombre",
            fr: "Nom",
            pt: "Nome",
        }),
        "profiles.namePlaceholder": t({
            en: "Work",
            es: "Trabajo",
            fr: "Travail",
            pt: "Trabalho",
        }),
        "profiles.new": t({
            en: "New Profile",
            es: "Nuevo perfil",
            fr: "Nouveau profil",
            pt: "Novo perfil",
        }),
        "profiles.personal": t({
            en: "Personal",
            es: "Personal",
            fr: "Personnel",
            pt: "Pessoal",
        }),
        "profiles.title": t({
            en: "Profiles",
            es: "Perfiles",
            fr: "Profils",
            pt: "Perfis",
        }),
    },
    key: "profiles" as const,
} satisfies Dictionary;

export default profiles;
