import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardMerchant = {
    content: {
        applies: insert(
            t({
                en: "Applies to {{count}} {{merchant}} entries",
                de: "Gilt für {{count}} Einträge von {{merchant}}",
                es: "Se aplica a {{count}} movimientos de {{merchant}}",
                fr: "S'applique à {{count}} opérations {{merchant}}",
                pt: "Vale para {{count}} lançamentos de {{merchant}}",
                "pt-PT": "Vale para {{count}} registos de {{merchant}}",
            })
        ),
        appliesOne: insert(
            t({
                en: "Applies to new {{merchant}} entries too",
                de: "Gilt auch für neue Einträge von {{merchant}}",
                es: "También se aplica a los nuevos movimientos de {{merchant}}",
                fr: "S'applique aussi aux nouvelles opérations {{merchant}}",
                pt: "Vale também para novos lançamentos de {{merchant}}",
                "pt-PT": "Vale também para novos registos de {{merchant}}",
            })
        ),
        cancel: t({ en: "Cancel", de: "Abbrechen", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        checking: t({
            en: "Looking for a logo…",
            de: "Suche nach einem Logo…",
            es: "Buscando un logo…",
            fr: "Recherche d'un logo…",
            pt: "Procurando um logo…",
            "pt-PT": "A procurar um logótipo…",
        }),
        choosePhoto: t({
            en: "Choose a photo",
            de: "Foto auswählen",
            es: "Elegir una foto",
            fr: "Choisir une photo",
            pt: "Escolher uma foto",
        }),
        confirm: {
            action: t({ en: "Rename", de: "Umbenennen", es: "Renombrar", fr: "Renommer", pt: "Renomear" }),
            body: insert(
                t({
                    en: "{{from}} becomes {{to}} on {{count}} entries. New {{from}} entries get the new name too.",
                    de: "{{from}} wird bei {{count}} Einträgen zu {{to}}. Neue Einträge von {{from}} bekommen den neuen Namen auch.",
                    es: "{{from}} pasa a llamarse {{to}} en {{count}} movimientos. Los nuevos movimientos de {{from}} también tendrán el nuevo nombre.",
                    fr: "{{from}} devient {{to}} sur {{count}} opérations. Les nouvelles opérations {{from}} prendront aussi le nouveau nom.",
                    pt: "{{from}} passa a se chamar {{to}} em {{count}} lançamentos. Os novos lançamentos de {{from}} também vão ter o novo nome.",
                    "pt-PT":
                        "{{from}} passa a se chamar {{to}} em {{count}} registos. Os novos registos de {{from}} também vão ter o novo nome.",
                })
            ),
            bodyOne: insert(
                t({
                    en: "{{from}} becomes {{to}}. New {{from}} entries get the new name too.",
                    de: "{{from}} wird zu {{to}}. Neue Einträge von {{from}} bekommen den neuen Namen auch.",
                    es: "{{from}} pasa a llamarse {{to}}. Los nuevos movimientos de {{from}} también tendrán el nuevo nombre.",
                    fr: "{{from}} devient {{to}}. Les nouvelles opérations {{from}} prendront aussi le nouveau nom.",
                    pt: "{{from}} passa a se chamar {{to}}. Os novos lançamentos de {{from}} também vão ter o novo nome.",
                    "pt-PT":
                        "{{from}} passa a se chamar {{to}}. Os novos registos de {{from}} também vão ter o novo nome.",
                })
            ),
            title: insert(
                t({
                    en: "Rename {{count}} entries?",
                    de: "{{count}} Einträge umbenennen?",
                    es: "¿Renombrar {{count}} movimientos?",
                    fr: "Renommer {{count}} opérations ?",
                    pt: "Renomear {{count}} lançamentos?",
                    "pt-PT": "Renomear {{count}} registos?",
                })
            ),
            titleOne: t({
                en: "Rename this merchant?",
                de: "Diesen Händler umbenennen?",
                es: "¿Renombrar este comercio?",
                fr: "Renommer ce marchand ?",
                pt: "Renomear este estabelecimento?",
            }),
        },
        edit: t({
            en: "Edit merchant",
            de: "Händler bearbeiten",
            es: "Editar comercio",
            fr: "Modifier le marchand",
            pt: "Editar estabelecimento",
        }),
        failed: t({
            en: "Couldn't save the merchant",
            de: "Händler konnte nicht gespeichert werden",
            es: "No se pudo guardar el comercio",
            fr: "Impossible d'enregistrer le marchand",
            pt: "Não foi possível salvar o estabelecimento",
            "pt-PT": "Não foi possível guardar o estabelecimento",
        }),
        find: t({
            en: "Find logo",
            de: "Logo suchen",
            es: "Buscar logo",
            fr: "Chercher le logo",
            pt: "Buscar logo",
            "pt-PT": "Pesquisar logo",
        }),
        found: insert(
            t({
                en: "Logo from {{domain}}",
                de: "Logo von {{domain}}",
                es: "Logo de {{domain}}",
                fr: "Logo de {{domain}}",
                pt: "Logo de {{domain}}",
                "pt-PT": "Logótipo de {{domain}}",
            })
        ),
        logo: t({ en: "Logo", de: "Logo", es: "Logo", fr: "Logo", pt: "Logo" }),
        missing: t({
            en: "No logo found",
            de: "Kein Logo gefunden",
            es: "No encontramos un logo",
            fr: "Aucun logo trouvé",
            pt: "Nenhum logo encontrado",
        }),
        missingHint: t({
            en: "Add the website and Outlayr will look there.",
            de: "Füge die Website hinzu, dann sucht Outlayr dort.",
            es: "Agrega el sitio web y Outlayr buscará ahí.",
            "es-ES": "Añade el sitio web y Outlayr buscará ahí.",
            fr: "Ajoutez le site web et Outlayr cherchera là.",
            pt: "Adicione o site e o Outlayr vai procurar lá.",
        }),
        name: t({
            en: "Merchant name",
            de: "Name des Händlers",
            es: "Nombre del comercio",
            fr: "Nom du marchand",
            pt: "Nome do estabelecimento",
        }),
        nameRequired: t({
            en: "Add a name",
            de: "Gib einen Namen ein",
            es: "Escribe un nombre",
            fr: "Ajoutez un nom",
            pt: "Escreva um nome",
        }),
        noLogoThere: t({
            en: "No logo at that address.",
            de: "Unter dieser Adresse gibt es kein Logo.",
            es: "No hay un logo en esa dirección.",
            fr: "Aucun logo à cette adresse.",
            pt: "Nenhum logo nesse endereço.",
            "pt-PT": "Nenhum logótipo nesse endereço.",
        }),
        photo: t({ en: "Photo", de: "Foto", es: "Foto", fr: "Photo", pt: "Foto" }),
        photoChosen: t({
            en: "Your photo",
            de: "Dein Foto",
            es: "Tu foto",
            fr: "Votre photo",
            pt: "Sua foto",
        }),
        photoFailed: t({
            en: "The photo couldn't be uploaded. Photos need Pro and a connection.",
            de: "Das Foto konnte nicht hochgeladen werden. Fotos brauchen Pro und eine Verbindung.",
            es: "No se pudo subir la foto. Las fotos necesitan Pro y conexión.",
            fr: "La photo n'a pas pu être envoyée. Les photos demandent Pro et une connexion.",
            pt: "Não foi possível enviar a foto. Fotos precisam do Pro e de conexão.",
        }),
        save: t({
            en: "Save changes",
            de: "Änderungen speichern",
            es: "Guardar cambios",
            fr: "Enregistrer",
            pt: "Salvar alterações",
            "pt-PT": "Guardar alterações",
        }),
        saved: t({
            en: "Merchant updated",
            de: "Händler aktualisiert",
            es: "Comercio actualizado",
            fr: "Marchand mis à jour",
            pt: "Estabelecimento atualizado",
        }),
        savedMany: insert(
            t({
                en: "{{count}} entries updated",
                de: "{{count}} Einträge aktualisiert",
                es: "{{count}} movimientos actualizados",
                fr: "{{count}} opérations mises à jour",
                pt: "{{count}} lançamentos atualizados",
                "pt-PT": "{{count}} registos atualizados",
            })
        ),
        shared: insert(
            t({
                en: "Shared with everyone who logs {{merchant}}.",
                de: "Geteilt mit allen, die {{merchant}} erfassen.",
                es: "Se comparte con todos los que registren {{merchant}}.",
                fr: "Partagé avec tous ceux qui enregistrent {{merchant}}.",
                pt: "Compartilhado com todos que registrarem {{merchant}}.",
                "pt-PT": "Partilhado com todos que registrarem {{merchant}}.",
            })
        ),
        title: t({ en: "Merchant", de: "Händler", es: "Comercio", fr: "Marchand", pt: "Estabelecimento" }),
        website: t({ en: "Website", de: "Website", es: "Sitio web", fr: "Site web", pt: "Site" }),
        websitePlaceholder: t({
            en: "Paste its website",
            de: "Füge die Website ein",
            es: "Pega su sitio web",
            fr: "Collez son site web",
            pt: "Cole o site",
        }),
    },
    key: "dashboard-merchant",
} satisfies Dictionary;

export default dashboardMerchant;
