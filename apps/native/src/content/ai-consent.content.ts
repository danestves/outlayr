import { t } from "intlayer";
import type { Dictionary } from "intlayer";

// App Review 5.1.1(i), 5.1.2(i): each row must stay true to what the matching backend action sends and to the
// privacy policy's "Suggestions, voice, and receipts".
const aiConsent = {
    content: {
        "aiConsent.allow": t({
            en: "Allow",
            es: "Permitir",
            fr: "Autoriser",
            pt: "Permitir",
        }),
        "aiConsent.eyebrow": t({
            en: "Smart features",
            es: "Funciones inteligentes",
            fr: "Fonctions intelligentes",
            pt: "Recursos inteligentes",
            "pt-PT": "Funcionalidades inteligentes",
        }),
        "aiConsent.fine": t({
            en: "Suggestions never include amounts, dates, or accounts. We don't keep recordings, photos, or screenshots.",
            es: "Las sugerencias nunca incluyen montos, fechas ni cuentas. No guardamos grabaciones, fotos ni capturas.",
            "es-ES":
                "Las sugerencias nunca incluyen importes, fechas ni cuentas. No guardamos grabaciones, fotos ni capturas.",
            fr: "Les suggestions n'incluent jamais les montants, les dates ni les comptes. Nous ne conservons ni enregistrements, ni photos, ni captures d'écran.",
            pt: "As sugestões nunca incluem valores, datas ou contas. Não armazenamos gravações, fotos nem capturas de tela.",
            "pt-PT":
                "As sugestões nunca incluem valores, datas ou contas. Não guardamos gravações, fotos nem capturas de ecrã.",
        }),
        "aiConsent.lead": t({
            en: "These features need an account and use Claude, made by Anthropic, through our server. ElevenLabs turns recordings into text. Neither gets your name, email, or account ID.",
            es: "Estas funciones necesitan una cuenta y usan Claude, de Anthropic, a través de nuestro servidor. ElevenLabs convierte las grabaciones en texto. Ninguna recibe tu nombre, tu correo ni el ID de tu cuenta.",
            fr: "Ces fonctions nécessitent un compte et utilisent Claude, d'Anthropic, via notre serveur. ElevenLabs transcrit les enregistrements. Aucun des deux ne reçoit votre nom, votre e-mail ni l'identifiant de votre compte.",
            pt: "Estes recursos precisam de uma conta e usam o Claude, da Anthropic, pelo nosso servidor. A ElevenLabs transforma gravações em texto. Nenhuma das duas recebe seu nome, e-mail ou ID da conta.",
            "pt-PT":
                "Estas funcionalidades precisam de uma conta e usam o Claude, da Anthropic, através do nosso servidor. A ElevenLabs transforma gravações em texto. Nenhuma das duas recebe o seu nome, e-mail ou ID da conta.",
        }),
        "aiConsent.lookup": t({
            en: "Web lookup",
            es: "Búsqueda web",
            fr: "Recherche web",
            pt: "Busca na web",
            "pt-PT": "Pesquisa na web",
        }),
        "aiConsent.lookupSends": t({
            en: "Anthropic may search the web for a merchant's name",
            es: "Anthropic puede buscar en la web el nombre de un comercio",
            fr: "Anthropic peut rechercher le nom d'un commerçant sur le web",
            pt: "A Anthropic pode buscar na web o nome de um estabelecimento",
            "pt-PT": "A Anthropic pode pesquisar na web o nome de um estabelecimento",
        }),
        "aiConsent.notNow": t({
            en: "Not now",
            es: "Ahora no",
            fr: "Pas maintenant",
            pt: "Agora não",
        }),
        "aiConsent.planScan": t({
            en: "Installment plan import",
            es: "Importar un plan de cuotas",
            fr: "Import d'échéancier",
            pt: "Importar compra parcelada",
            "pt-PT": "Importar compra a prestações",
        }),
        "aiConsent.planScanSends": t({
            en: "The screenshot, the account's name, currency, language, region, and today's date",
            es: "La captura, el nombre de la cuenta, la moneda, el idioma, la región y la fecha de hoy",
            fr: "La capture d'écran, le nom du compte, la devise, la langue, la région et la date du jour",
            pt: "A captura de tela, o nome da conta, a moeda, o idioma, a região e a data de hoje",
            "pt-PT": "A captura de ecrã, o nome da conta, a moeda, o idioma, a região e a data de hoje",
        }),
        "aiConsent.privacy": t({
            en: "Privacy policy",
            es: "Política de privacidad",
            fr: "Politique de confidentialité",
            pt: "Política de privacidade",
        }),
        "aiConsent.scan": t({
            en: "Receipt scan",
            es: "Escanear un recibo",
            "es-ES": "Escanear un ticket",
            fr: "Scan de ticket",
            pt: "Escanear recibo",
            "pt-PT": "Digitalizar talão",
        }),
        "aiConsent.scanSends": t({
            en: "The photo, plus the same details as voice entry and your region",
            es: "La foto, más los mismos datos que al dictar y tu región",
            fr: "La photo, plus les mêmes données que la saisie vocale et votre région",
            pt: "A foto, mais os mesmos dados do ditado e a sua região",
        }),
        "aiConsent.suggestions": t({
            en: "Category suggestions",
            es: "Sugerencias de categoría",
            fr: "Suggestions de catégorie",
            pt: "Sugestões de categoria",
        }),
        "aiConsent.suggestionsSends": t({
            en: "Merchant names, expense or income, currency, language, region, and your category names. On import, CSV descriptions with long numbers removed.",
            es: "Nombres de comercios, si es gasto o ingreso, la moneda, el idioma, la región y los nombres de tus categorías. Al importar, las descripciones del CSV sin los números largos.",
            fr: "Noms des commerçants, dépense ou revenu, devise, langue, région et vos noms de catégories. À l'import, les libellés du CSV sans les longs numéros.",
            pt: "Nomes de estabelecimentos, se é despesa ou receita, a moeda, o idioma, a região e os nomes das suas categorias. Na importação, as descrições do CSV sem os números longos.",
        }),
        "aiConsent.title": t({
            en: "Send data to Anthropic and ElevenLabs?",
            es: "¿Enviar datos a Anthropic y ElevenLabs?",
            fr: "Envoyer des données à Anthropic et ElevenLabs ?",
            pt: "Enviar dados à Anthropic e à ElevenLabs?",
        }),
        "aiConsent.voice": t({
            en: "Voice entry",
            es: "Dictar un registro",
            fr: "Saisie vocale",
            pt: "Ditar um lançamento",
            "pt-PT": "Ditar um registo",
        }),
        "aiConsent.voiceSends": t({
            en: "The recording, your account and category names, currency, language, and today's date",
            es: "La grabación, los nombres de tus cuentas y categorías, la moneda, el idioma y la fecha de hoy",
            fr: "L'enregistrement, les noms de vos comptes et catégories, la devise, la langue et la date du jour",
            pt: "A gravação, os nomes das suas contas e categorias, a moeda, o idioma e a data de hoje",
        }),
    },
    key: "ai-consent" as const,
} satisfies Dictionary;

export default aiConsent;
