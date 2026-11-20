import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardReceipt = {
    content: {
        byHand: t({
            en: "Enter by hand",
            de: "Von Hand eingeben",
            es: "Escribirlo a mano",
            fr: "Saisir à la main",
            pt: "Digitar à mão",
        }),
        card: {
            of: insert(
                t({
                    en: "{{merchant}} receipt",
                    de: "Beleg von {{merchant}}",
                    es: "Recibo de {{merchant}}",
                    fr: "Ticket {{merchant}}",
                    pt: "Recibo de {{merchant}}",
                })
            ),
            scanned: t({ en: "Scanned", de: "Gescannt", es: "Escaneado", fr: "Scanné", pt: "Escaneado" }),
            scannedMany: insert(
                t({
                    en: "Scanned, {{count}} items",
                    de: "Gescannt, {{count}} Positionen",
                    es: "Escaneado, {{count}} artículos",
                    fr: "Scanné, {{count}} articles",
                    pt: "Escaneado, {{count}} itens",
                })
            ),
            scannedOne: t({
                en: "Scanned, 1 item",
                de: "Gescannt, 1 Position",
                es: "Escaneado, 1 artículo",
                fr: "Scanné, 1 article",
                pt: "Escaneado, 1 item",
            }),
        },
        choose: t({
            en: "Choose a file",
            de: "Datei auswählen",
            es: "Elegir un archivo",
            fr: "Choisir un fichier",
            pt: "Escolher um arquivo",
        }),
        chooseAnother: t({
            en: "Choose another file",
            de: "Andere Datei auswählen",
            es: "Elegir otro archivo",
            fr: "Choisir un autre fichier",
            pt: "Escolher outro arquivo",
        }),
        consent: {
            feature: t({
                en: "Receipt scan",
                de: "Belegscan",
                es: "Escanear un recibo",
                fr: "Scan de ticket",
                pt: "Escanear recibo",
            }),
            fine: t({
                en: "A PDF becomes a photo of its first page on this device, and only that photo is sent. It goes through our server to a third-party AI provider, which never gets your name, email, or account ID. We don't keep the photo. Nothing is saved until you add the entry, which keeps the merchant, amount, date, and items.",
                de: "Aus einem PDF wird auf diesem Gerät ein Foto der ersten Seite, und nur dieses Foto wird gesendet. Es läuft über unseren Server zu einem KI-Anbieter, der weder deinen Namen noch deine E-Mail-Adresse oder Konto-ID erhält. Das Foto speichern wir nicht. Gespeichert wird erst, wenn du den Eintrag hinzufügst, und er behält Händler, Betrag, Datum und Positionen.",
                es: "Un PDF se convierte en una foto de su primera página en este dispositivo, y solo se envía esa foto. Pasa por nuestro servidor hacia un proveedor de IA externo, que nunca recibe tu nombre, tu correo ni el ID de tu cuenta. No guardamos la foto. No se guarda nada hasta que agregues el movimiento, que conserva el comercio, el monto, la fecha y los artículos.",
                fr: "Un PDF devient une photo de sa première page sur cet appareil, et seule cette photo est envoyée. Elle passe par notre serveur vers un fournisseur d'IA tiers, qui ne reçoit jamais votre nom, votre e-mail ni l'identifiant de votre compte. Nous ne conservons pas la photo. Rien n'est enregistré avant que vous ajoutiez l'opération, qui garde le commerçant, le montant, la date et les articles.",
                pt: "Um PDF vira uma foto da primeira página neste dispositivo, e só essa foto é enviada. Ela passa pelo nosso servidor até um provedor de IA terceiro, que nunca recebe seu nome, e-mail ou ID da conta. Não guardamos a foto. Nada é salvo até você adicionar o lançamento, que guarda o estabelecimento, o valor, a data e os itens.",
            }),
            sends: t({
                en: "The photo, your account and category names, ledger currency, language, region, and today's date",
                de: "Das Foto, die Namen deiner Konten und Kategorien, die Währung des Haushaltsbuchs, Sprache, Region und das heutige Datum",
                es: "La foto, los nombres de tus cuentas y categorías, la moneda de tus finanzas, el idioma, la región y la fecha de hoy",
                fr: "La photo, les noms de vos comptes et catégories, la devise du registre, la langue, la région et la date du jour",
                pt: "A foto, os nomes das suas contas e categorias, a moeda das suas finanças, o idioma, a região e a data de hoje",
            }),
        },
        drop: t({
            en: "Drop a photo or PDF here, or paste one",
            de: "Foto oder PDF hierher ziehen oder einfügen",
            es: "Suelta aquí una foto o un PDF, o pégalo",
            fr: "Déposez une photo ou un PDF ici, ou collez-le",
            pt: "Solte aqui uma foto ou um PDF, ou cole",
        }),
        failed: {
            notConfigured: t({
                en: "Scanning a receipt needs the cloud tier.",
                de: "Das Scannen eines Belegs braucht die Cloud-Stufe.",
                es: "Para escanear recibos se necesita el servicio en la nube.",
                fr: "Le scan de tickets nécessite le service cloud.",
                pt: "Escanear recibos requer o serviço na nuvem.",
            }),
            notEntitled: t({
                en: "Your free captures, voice and receipts together, are used up. They come back within 30 days; Pro lifts the limit.",
                de: "Deine kostenlosen Erfassungen, Sprache und Belege zusammen, sind aufgebraucht. Sie kommen innerhalb von 30 Tagen zurück; Pro hebt das Limit auf.",
                es: "Ya usaste tus capturas gratis (voz y recibos). Se renuevan en menos de 30 días; con Pro no tienes ese límite.",
                fr: "Vos captures gratuites (voix et tickets confondus) sont épuisées. Elles reviennent sous 30 jours ; Pro supprime la limite.",
                pt: "Você já usou suas capturas grátis (voz e recibos). Elas se renovam em até 30 dias; com o Pro não há esse limite.",
            }),
            offline: t({
                en: "You're offline.",
                de: "Du bist offline.",
                es: "Estás sin conexión.",
                fr: "Vous êtes hors ligne.",
                pt: "Você está sem conexão.",
            }),
            provider: t({
                en: "Couldn't read the receipt.",
                de: "Der Beleg konnte nicht gelesen werden.",
                es: "No pude leer el recibo.",
                fr: "Impossible de lire le ticket.",
                pt: "Não consegui ler o recibo.",
            }),
            quotaExceeded: t({
                en: "The fair-use limit for captures is reached. It resets within 30 days.",
                de: "Das Fair-Use-Limit für Erfassungen ist erreicht. Es wird innerhalb von 30 Tagen zurückgesetzt.",
                es: "Llegaste al límite de uso justo de capturas. Se renueva en menos de 30 días.",
                fr: "La limite d'utilisation raisonnable des captures est atteinte. Elle se réinitialise sous 30 jours.",
                pt: "Você atingiu o limite de uso justo de capturas. Ele se renova em até 30 dias.",
            }),
            rateLimited: t({
                en: "That's a lot of receipts at once. Give it a moment.",
                de: "Das sind viele Belege auf einmal. Gib ihm einen Moment.",
                es: "Son muchos recibos seguidos. Espera un momento.",
                fr: "Beaucoup de tickets d'un coup. Patientez un instant.",
                pt: "São muitos recibos seguidos. Espere um momento.",
            }),
            tooBig: t({
                en: "That file is over 10 MB.",
                de: "Diese Datei ist größer als 10 MB.",
                es: "Ese archivo pesa más de 10 MB.",
                fr: "Ce fichier dépasse 10 Mo.",
                pt: "Esse arquivo tem mais de 10 MB.",
            }),
            unauthenticated: t({
                en: "Sign in to scan a receipt.",
                de: "Melde dich an, um einen Beleg zu scannen.",
                es: "Inicia sesión para escanear un recibo.",
                fr: "Connectez-vous pour scanner un ticket.",
                pt: "Entre para escanear um recibo.",
            }),
            unclear: t({
                en: "Didn't find a receipt in that file.",
                de: "In dieser Datei war kein Beleg zu finden.",
                es: "No encontré un recibo en ese archivo.",
                fr: "Aucun ticket trouvé dans ce fichier.",
                pt: "Não encontrei um recibo nesse arquivo.",
            }),
            unreadable: t({
                en: "Couldn't open that file.",
                de: "Die Datei konnte nicht geöffnet werden.",
                es: "No pude abrir ese archivo.",
                fr: "Impossible d'ouvrir ce fichier.",
                pt: "Não consegui abrir esse arquivo.",
            }),
        },
        files: t({ en: "Files", de: "Dateien", es: "Archivos", fr: "Fichiers", pt: "Arquivos" }),
        intro: t({
            en: "A photo of the ticket is enough. The total, the store, the date and every line, read for you.",
            de: "Ein Foto vom Beleg reicht. Summe, Geschäft, Datum und jede Zeile werden für dich gelesen.",
            es: "Basta con una foto del ticket. Leemos por ti el total, la tienda, la fecha y cada línea.",
            fr: "Une photo du ticket suffit. Total, magasin, date et chaque ligne : tout est lu pour vous.",
            pt: "Basta uma foto do recibo. Lemos para você o total, a loja, a data e cada item.",
        }),
        limit: t({
            en: "Photo or PDF, up to 10 MB",
            de: "Foto oder PDF, bis 10 MB",
            es: "Foto o PDF, hasta 10 MB",
            fr: "Photo ou PDF, 10 Mo max.",
            pt: "Foto ou PDF, até 10 MB",
        }),
        preparing: t({
            en: "Preparing the photo…",
            de: "Foto wird vorbereitet…",
            es: "Preparando la foto…",
            fr: "Préparation de la photo…",
            pt: "Preparando a foto…",
        }),
        reading: t({
            en: "Reading the receipt…",
            de: "Beleg wird gelesen…",
            es: "Leyendo el recibo…",
            fr: "Lecture du ticket…",
            pt: "Lendo o recibo…",
        }),
        remove: t({
            en: "Remove receipt",
            de: "Beleg entfernen",
            es: "Quitar recibo",
            fr: "Retirer le ticket",
            pt: "Remover recibo",
        }),
        retry: t({
            en: "Try again",
            de: "Noch mal versuchen",
            es: "Intentar de nuevo",
            fr: "Réessayer",
            pt: "Tentar de novo",
        }),
        subtotal: t({ en: "Subtotal", de: "Zwischensumme", es: "Subtotal", fr: "Sous-total", pt: "Subtotal" }),
        tax: t({ en: "Tax", de: "Steuer", es: "Impuestos", fr: "Taxes", pt: "Impostos" }),
        tip: t({ en: "Tip", de: "Trinkgeld", es: "Propina", fr: "Pourboire", pt: "Gorjeta" }),
        title: t({
            en: "Scan a receipt",
            de: "Beleg scannen",
            es: "Escanear un recibo",
            fr: "Scanner un ticket",
            pt: "Escanear um recibo",
        }),
    },
    key: "dashboard-receipt",
} satisfies Dictionary;

export default dashboardReceipt;
