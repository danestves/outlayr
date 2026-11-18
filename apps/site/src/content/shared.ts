import { t } from "intlayer";

export const PRODUCT_DEFINITION = t({
    en: "Outlayr is the expense tracker that never links your bank: log by sentence, voice, receipt or Apple Pay, in any of 165 currencies.",
    de: "Outlayr ist der Ausgaben-Tracker, der nie dein Bankkonto verknüpft: Erfasse per Satz, Sprache, Beleg oder Apple Pay, in jeder von 165 Währungen.",
    es: "Outlayr es la app de gastos que nunca conecta tu banco: registra con una frase, tu voz, un recibo o Apple Pay, en cualquiera de 165 monedas.",
    pt: "O Outlayr é o app de controle de gastos que nunca conecta seu banco: registre por frase, voz, recibo ou Apple Pay, em qualquer uma de 165 moedas.",
    fr: "Outlayr est l'app de suivi des dépenses qui ne connecte jamais votre banque : saisissez par une phrase, la voix, un ticket ou Apple Pay, dans l'une des 165 devises.",
});

export const RECEIPT_SCAN_ANSWER = t({
    en: "Take a photo of the receipt or pick one from your library. Outlayr reads the store, the date, the total, and every line, then fills in the entry for you to save. Scanning needs an account, and each scan counts as one capture.",
    de: "Mach ein Foto vom Beleg oder wähle eines aus deiner Fotomediathek. Outlayr liest Geschäft, Datum, Summe und jede Zeile und füllt den Eintrag aus, damit du ihn speicherst. Fürs Scannen brauchst du ein Konto, und jeder Scan zählt als eine Erfassung.",
    es: "Toma una foto del recibo o elige una de tu galería. Outlayr lee la tienda, la fecha, el total y cada línea, y llena el registro para que lo guardes. Para escanear necesitas una cuenta, y cada escaneo equivale a una captura.",
    pt: "Tire uma foto do recibo ou escolha uma da sua galeria. O Outlayr lê o estabelecimento, a data, o total e cada item, e preenche o lançamento para você salvar. Para escanear, você precisa de uma conta, e cada escaneamento conta como uma captura.",
    fr: "Prenez le ticket en photo ou choisissez une photo dans votre galerie. Outlayr lit le commerce, la date, le total et chaque ligne, puis remplit l'opération pour que vous l'enregistriez. Le scan nécessite un compte, et chaque scan compte comme une capture.",
});

export const OPEN_SOURCE_ANSWER = t({
    en: "Yes. The code for the app and its server is public on GitHub at github.com/danestves/outlayr. The app is licensed under GPL-3.0 and the server under AGPL-3.0.",
    de: "Ja. Der Code der App und ihres Servers ist öffentlich auf GitHub unter github.com/danestves/outlayr. Die App steht unter der Lizenz GPL-3.0, der Server unter AGPL-3.0.",
    es: "Sí. El código de la app y de su servidor es público en GitHub, en github.com/danestves/outlayr. La app usa la licencia GPL-3.0 y el servidor, AGPL-3.0.",
    pt: "Sim. O código do app e do servidor é público no GitHub, em github.com/danestves/outlayr. O app usa a licença GPL-3.0 e o servidor, AGPL-3.0.",
    fr: "Oui. Le code de l'app et de son serveur est public sur GitHub, à l'adresse github.com/danestves/outlayr. L'app est sous licence GPL-3.0 et le serveur sous AGPL-3.0.",
});

export const OPEN_SOURCE_QUESTION = t({
    en: "Is Outlayr open source?",
    de: "Ist Outlayr Open Source?",
    es: "¿Outlayr es de código abierto?",
    pt: "O Outlayr é de código aberto?",
    fr: "Outlayr est-il open source ?",
});

export const BUDGETS_SCREEN_ALT = t({
    en: "Outlayr Budgets screen: $1,018.59 left this month, a spending curve projected past the limit, and the note that on this pace the period ends $319 short.",
    de: "Outlayr-Bildschirm „Budgets“: 1.018,59 $ übrig diesen Monat, eine Ausgabenkurve, die über das Limit hinausreicht, und der Hinweis, dass in diesem Tempo am Ende des Zeitraums 319 $ fehlen.",
    es: "Pantalla de presupuestos de Outlayr: $1,018.59 disponibles este mes, una curva de gasto que pasa el límite y la nota de que, a este ritmo, te faltarán $319 al final del período.",
    pt: "Tela de Orçamentos do Outlayr: $ 1.018,59 restantes neste mês, uma curva de gastos projetada além do limite e o aviso de que, nesse ritmo, o período termina com $ 319 faltando.",
    fr: "Écran Budgets d'Outlayr : 1 018,59 $ restants ce mois-ci, une courbe de dépenses projetée au-delà de la limite, et la mention qu'à ce rythme la période se termine avec 319 $ de manque.",
});

export const ACCOUNTS_SCREEN_ALT = t({
    en: "Outlayr Accounts screen listing eight accounts, including Banesco in bolívares and an Apple Card with a negative balance, above a Transfer button.",
    de: "Outlayr-Bildschirm „Konten“ mit acht Konten, darunter Banesco in Bolívar und eine Apple Card mit negativem Kontostand, über einer Schaltfläche „Umbuchung“.",
    es: "Pantalla de cuentas de Outlayr: tienes $26,175.52 y debes $2,082.70, con seis cuentas, entre ellas Banesco en bolívares, y dos tarjetas, Amex Gold y Apple Card.",
    pt: "Tela de Contas do Outlayr com oito contas, entre elas o Banesco em bolívares e um Apple Card com saldo negativo, acima de um botão Transferência.",
    fr: "Écran Comptes d'Outlayr listant huit comptes, dont Banesco en bolivars et une Apple Card au solde négatif, au-dessus d'un bouton Virement.",
});

export const APPEARANCE_EXTRA = {
    label: t({ en: "Appearance", de: "Darstellung", es: "Apariencia", pt: "Aparência", fr: "Apparence" }),
    text: t({
        en: "Light and dark, five accent colors, five app icons.",
        de: "Hell und dunkel, fünf Akzentfarben, fünf App-Symbole.",
        es: "Claro y oscuro, cinco colores de acento y cinco íconos de la app.",
        pt: "Claro e escuro, cinco cores de destaque e cinco ícones do app.",
        fr: "Clair et sombre, cinq couleurs d'accent et cinq icônes d'app.",
    }),
};

export const EXPORT_EXTRA = {
    label: t({ en: "Export", de: "Export", es: "Exportar", pt: "Exportar", fr: "Exporter" }),
    text: t({
        en: "A CSV, or a full archive you can restore from.",
        de: "Eine CSV-Datei oder ein vollständiges Archiv, aus dem du wiederherstellen kannst.",
        es: "Un CSV o un archivo completo desde el que puedes restaurar.",
        pt: "Um CSV ou um arquivo completo que você pode restaurar depois.",
        fr: "Un CSV, ou une archive complète à partir de laquelle restaurer.",
    }),
};

export const OFFLINE_EXTRA = {
    label: t({ en: "Offline", de: "Offline", es: "Sin conexión", pt: "Sem conexão", fr: "Hors ligne" }),
    text: t({
        en: "Entries save on the phone first, so typing an entry works with no signal.",
        de: "Einträge werden zuerst auf dem Handy gespeichert, also klappt Tippen auch ohne Empfang.",
        es: "Los registros se guardan primero en el celular, así que puedes escribir un registro sin señal.",
        pt: "Os lançamentos ficam primeiro no celular, então digitar funciona sem sinal.",
        fr: "Les opérations sont d'abord enregistrées sur le téléphone, donc la saisie au clavier marche sans réseau.",
    }),
};

export const SPLIT_EXTRA = {
    label: t({ en: "Split", de: "Aufteilen", es: "Dividir", pt: "Dividir", fr: "Répartir" }),
    text: t({
        en: "Divide one purchase across several categories.",
        de: "Teile einen Einkauf auf mehrere Kategorien auf.",
        es: "Reparte una compra entre varias categorías.",
        pt: "Divida uma compra entre várias categorias.",
        fr: "Répartissez un achat entre plusieurs catégories.",
    }),
};
