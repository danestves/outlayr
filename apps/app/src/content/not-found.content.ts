import { t } from "intlayer";
import type { Dictionary } from "intlayer";

export default {
    content: {
        home: t({
            en: "Open Outlayr",
            de: "Outlayr öffnen",
            es: "Abrir Outlayr",
            pt: "Abrir o Outlayr",
            fr: "Ouvrir Outlayr",
            it: "Apri Outlayr",
            nl: "Outlayr openen",
            ja: "Outlayrを開く",
            ko: "Outlayr 열기",
        }),
        meta: t({
            en: "Error 404",
            de: "Fehler 404",
            es: "Error 404",
            pt: "Erro 404",
            fr: "Erreur 404",
            it: "Errore 404",
            nl: "Fout 404",
            ja: "エラー404",
            ko: "오류 404",
        }),
        title: t({
            en: "Nothing is filed under this address",
            de: "Unter dieser Adresse ist nichts abgelegt",
            es: "No hay nada archivado en esta dirección",
            pt: "Não há nada arquivado neste endereço",
            fr: "Rien n'est classé à cette adresse",
            it: "Non c'è niente archiviato a questo indirizzo",
            nl: "Op dit adres is niets opgeslagen",
            ja: "このアドレスには何もありません",
            ko: "이 주소에는 보관된 내용이 없어요",
        }),
    },
    key: "not-found",
} satisfies Dictionary;
