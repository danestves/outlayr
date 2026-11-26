import type { Language } from "../language";
import { Note, renderEmail } from "../note";
import type { NoteItem } from "../note";

type Provider = "apple" | "email" | "google";

interface WelcomeEmailProps {
    email: string;
    language: Language;
    provider: Provider;
}

interface WelcomeCopy {
    account: string;
    after: string;
    footer: (email: string) => string;
    intro: string;
    items: readonly NoteItem[];
    lead: string;
    passwordProvider: string;
    preview: string;
    signedInWith: string;
    subject: string;
    web: string;
}

const COPY = {
    en: {
        account: "Account",
        after: "You can export or delete everything at any time in Settings.",
        footer: (email) =>
            `Sent to ${email} because this address created an Outlayr account. Questions? Write to support@tryoutlayr.com.`,
        intro: "Your entries stay on your phone. Your account adds:",
        items: [
            { detail: "Say what you spent and Outlayr writes the entry.", label: "Speak an entry" },
            { detail: "Take a photo and Outlayr reads the total.", label: "Scan a receipt" },
            { detail: "Type a merchant and Outlayr suggests the category.", label: "Smart fill" },
        ],
        lead: "Your Outlayr account is ready.",
        passwordProvider: "Email and password",
        preview: "What your account adds.",
        signedInWith: "Signed in with",
        subject: "Your Outlayr account is ready",
        web: "You can also open your ledger on the web at app.tryoutlayr.com with Pro.",
    },
    de: {
        account: "Konto",
        after: "Du kannst jederzeit in den Einstellungen alles exportieren oder löschen.",
        footer: (email) =>
            `Gesendet an ${email}, weil diese Adresse ein Outlayr-Konto angelegt hat. Fragen? Schreib an support@tryoutlayr.com.`,
        intro: "Deine Einträge bleiben auf deinem Handy. Dein Konto bringt dir:",
        items: [
            { detail: "Sag, was du ausgegeben hast, und Outlayr schreibt den Eintrag.", label: "Eintrag einsprechen" },
            { detail: "Mach ein Foto und Outlayr liest den Gesamtbetrag.", label: "Beleg scannen" },
            {
                detail: "Gib einen Händler ein und Outlayr schlägt die Kategorie vor.",
                label: "Intelligentes Ausfüllen",
            },
        ],
        lead: "Dein Outlayr-Konto ist bereit.",
        passwordProvider: "E-Mail und Passwort",
        preview: "Was dein Konto dir bringt.",
        signedInWith: "Angemeldet mit",
        subject: "Dein Outlayr-Konto ist bereit",
        web: "Du kannst dein Haushaltsbuch auch im Web unter app.tryoutlayr.com mit Pro öffnen.",
    },
    es: {
        account: "Cuenta",
        after: "Puedes exportar o borrar todo cuando quieras en Configuración.",
        footer: (email) =>
            `Enviado a ${email} porque esta dirección creó una cuenta de Outlayr. ¿Dudas? Escribe a support@tryoutlayr.com.`,
        intro: "Tus registros se quedan en tu teléfono. Tu cuenta suma:",
        items: [
            { detail: "Di lo que gastaste y Outlayr escribe el registro.", label: "Dictar un registro" },
            { detail: "Toma una foto y Outlayr lee el total.", label: "Escanear un recibo" },
            { detail: "Escribe un comercio y Outlayr sugiere la categoría.", label: "Autocompletado" },
        ],
        lead: "Tu cuenta de Outlayr está lista.",
        passwordProvider: "Correo y contraseña",
        preview: "Lo que suma tu cuenta.",
        signedInWith: "Acceso con",
        subject: "Tu cuenta de Outlayr está lista",
        web: "También puedes abrir tu registro en la web en app.tryoutlayr.com con Pro.",
    },
    fr: {
        account: "Compte",
        after: "Vous pouvez tout exporter ou supprimer à tout moment dans Réglages.",
        footer: (email) =>
            `Envoyé à ${email} parce que cette adresse a créé un compte Outlayr. Des questions ? Écrivez à support@tryoutlayr.com.`,
        intro: "Vos opérations restent sur votre téléphone. Votre compte ajoute :",
        items: [
            { detail: "Dites ce que vous avez dépensé et Outlayr saisit l'opération.", label: "Dicter une opération" },
            { detail: "Prenez une photo et Outlayr lit le total.", label: "Scanner un ticket" },
            { detail: "Saisissez un commerçant et Outlayr suggère la catégorie.", label: "Remplissage intelligent" },
        ],
        lead: "Votre compte Outlayr est prêt.",
        passwordProvider: "E-mail et mot de passe",
        preview: "Ce que votre compte ajoute.",
        signedInWith: "Connexion avec",
        subject: "Votre compte Outlayr est prêt",
        web: "Vous pouvez aussi ouvrir votre journal sur le Web à app.tryoutlayr.com avec Pro.",
    },
    pt: {
        account: "Conta",
        after: "Você pode exportar ou apagar tudo quando quiser em Ajustes.",
        footer: (email) =>
            `Enviado para ${email} porque este endereço criou uma conta do Outlayr. Dúvidas? Escreva para support@tryoutlayr.com.`,
        intro: "Seus lançamentos ficam no seu celular. Sua conta adiciona:",
        items: [
            { detail: "Diga quanto gastou e o Outlayr cria o lançamento.", label: "Ditar um lançamento" },
            { detail: "Tire uma foto e o Outlayr lê o total.", label: "Escanear um recibo" },
            { detail: "Digite um estabelecimento e o Outlayr sugere a categoria.", label: "Preenchimento inteligente" },
        ],
        lead: "Sua conta do Outlayr está pronta.",
        passwordProvider: "E-mail e senha",
        preview: "O que sua conta adiciona.",
        signedInWith: "Acesso com",
        subject: "Sua conta do Outlayr está pronta",
        web: "Você também pode abrir seus lançamentos na web em app.tryoutlayr.com com o Pro.",
    },
} satisfies Record<Language, WelcomeCopy>;

const providerName = (provider: Provider, copy: WelcomeCopy) =>
    provider === "email" ? copy.passwordProvider : { apple: "Apple", google: "Google" }[provider];

export default function WelcomeEmail({ email, language, provider }: WelcomeEmailProps) {
    const copy = COPY[language];
    return (
        <Note
            after={copy.after}
            facts={[
                [copy.account, email],
                [copy.signedInWith, providerName(provider, copy)],
            ]}
            footer={copy.footer(email)}
            language={language}
            lead={copy.lead}
            preview={copy.preview}
            sections={[
                { intro: copy.intro, items: copy.items },
                { intro: copy.web, items: [] },
            ]}
        />
    );
}

WelcomeEmail.PreviewProps = { email: "ana@example.com", language: "en", provider: "apple" } satisfies WelcomeEmailProps;

export const welcomeEmail = (props: WelcomeEmailProps) =>
    renderEmail(COPY[props.language].subject, <WelcomeEmail {...props} />);
