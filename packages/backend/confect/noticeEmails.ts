import type { Language } from "@outlayr/email/language";
import type { NoticeFraming } from "@outlayr/email/policy-change";

import { noticeKey, US_HOSTING_AT_MS } from "./legal";

export const NOTICE_FRAMINGS: ReadonlyMap<string, Record<Language, NoticeFraming>> = new Map([
    [
        noticeKey({ document: "privacy", effectiveAtMs: US_HOSTING_AT_MS }),
        {
            en: {
                aside: {
                    intro: "What stays the same:",
                    items: [
                        { label: "Everything between the app and our servers travels encrypted." },
                        { label: "Only you, and people you share a profile with, can read or change your data." },
                        { label: "Sign-in tokens and your Notion key are encrypted before we store them." },
                    ],
                },
                lead: [
                    "We're adding bank connections to Outlayr. The bank connection providers we're integrating, Plaid and Stripe Financial Connections, ask for our servers to be in the United States.",
                    "So we moved them. Your account and synced data now live on OVHcloud servers in the United States, instead of Hetzner in Helsinki, Finland.",
                    "Bank connections aren't live yet. When they are, connecting a bank will be your choice, and we'll tell you first what it shares.",
                ],
                preview: "Why we moved our servers, and what stays the same.",
                subject: "Your Outlayr data now lives in the United States",
            },
            de: {
                aside: {
                    intro: "Was gleich bleibt:",
                    items: [
                        { label: "Alles zwischen der App und unseren Servern wird verschlüsselt übertragen." },
                        {
                            label: "Nur du und die Personen, mit denen du ein Profil teilst, können deine Daten lesen oder ändern.",
                        },
                        {
                            label: "Anmelde-Tokens und dein Notion-Schlüssel werden verschlüsselt, bevor wir sie speichern.",
                        },
                    ],
                },
                lead: [
                    "Wir bauen Bankverbindungen in Outlayr ein. Die Anbieter, die wir dafür einbinden, Plaid und Stripe Financial Connections, erwarten, dass unsere Server in den Vereinigten Staaten stehen.",
                    "Deshalb sind wir umgezogen. Dein Konto und deine synchronisierten Daten liegen jetzt auf Servern von OVHcloud in den Vereinigten Staaten statt bei Hetzner in Helsinki, Finnland.",
                    "Bankverbindungen gibt es noch nicht. Wenn es so weit ist, entscheidest du selbst, ob du deine Bank verbindest, und wir sagen dir vorher, was dabei geteilt wird.",
                ],
                preview: "Warum wir unsere Server umgezogen haben und was gleich bleibt.",
                subject: "Deine Outlayr-Daten liegen jetzt in den Vereinigten Staaten",
            },
            es: {
                aside: {
                    intro: "Lo que no cambia:",
                    items: [
                        { label: "Todo lo que viaja entre la app y nuestros servidores va cifrado." },
                        {
                            label: "Solo tú y las personas con las que compartes un perfil pueden leer o cambiar tus datos.",
                        },
                        { label: "Los tokens de inicio de sesión y tu clave de Notion se cifran antes de guardarlos." },
                    ],
                },
                lead: [
                    "Estamos agregando conexiones bancarias a Outlayr. Los proveedores de conexión bancaria que estamos integrando, Plaid y Stripe Financial Connections, piden que nuestros servidores estén en Estados Unidos.",
                    "Así que los mudamos. Tu cuenta y tus datos sincronizados ahora están en servidores de OVHcloud en Estados Unidos, en lugar de Hetzner en Helsinki, Finlandia.",
                    "Las conexiones bancarias todavía no están disponibles. Cuando lo estén, conectar tu banco será tu decisión, y antes te diremos qué comparte.",
                ],
                preview: "Por qué mudamos nuestros servidores y qué no cambia.",
                subject: "Tus datos de Outlayr ahora están en Estados Unidos",
            },
            fr: {
                aside: {
                    intro: "Ce qui ne change pas :",
                    items: [
                        { label: "Tout ce qui circule entre l'app et nos serveurs est chiffré." },
                        {
                            label: "Seuls vous et les personnes avec qui vous partagez un profil pouvez lire ou modifier vos données.",
                        },
                        { label: "Les jetons de connexion et votre clé Notion sont chiffrés avant d'être stockés." },
                    ],
                },
                lead: [
                    "Nous ajoutons les connexions bancaires à Outlayr. Les prestataires de connexion bancaire que nous intégrons, Plaid et Stripe Financial Connections, demandent que nos serveurs soient aux États-Unis.",
                    "Nous les avons donc déplacés. Votre compte et vos données synchronisées sont désormais sur des serveurs OVHcloud aux États-Unis, au lieu de Hetzner à Helsinki, en Finlande.",
                    "Les connexions bancaires ne sont pas encore disponibles. Quand elles le seront, connecter votre banque sera votre choix, et nous vous dirons d'abord ce qui est partagé.",
                ],
                preview: "Pourquoi nous avons déplacé nos serveurs, et ce qui ne change pas.",
                subject: "Vos données Outlayr sont désormais aux États-Unis",
            },
            pt: {
                aside: {
                    intro: "O que continua igual:",
                    items: [
                        { label: "Tudo o que trafega entre o app e nossos servidores vai criptografado." },
                        {
                            label: "Só você e as pessoas com quem você compartilha um perfil podem ler ou alterar seus dados.",
                        },
                        {
                            label: "Os tokens de login e sua chave do Notion são criptografados antes de serem guardados.",
                        },
                    ],
                },
                lead: [
                    "Estamos adicionando conexões bancárias ao Outlayr. Os provedores de conexão bancária que estamos integrando, Plaid e Stripe Financial Connections, pedem que nossos servidores fiquem nos Estados Unidos.",
                    "Então mudamos. Sua conta e seus dados sincronizados agora ficam em servidores da OVHcloud nos Estados Unidos, em vez da Hetzner em Helsinque, Finlândia.",
                    "As conexões bancárias ainda não estão disponíveis. Quando estiverem, conectar seu banco será escolha sua, e antes vamos te dizer o que é compartilhado.",
                ],
                preview: "Por que mudamos nossos servidores e o que continua igual.",
                subject: "Seus dados do Outlayr agora ficam nos Estados Unidos",
            },
        },
    ],
]);
