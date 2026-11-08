import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const dashboardAbout = {
    content: {
        copyright: t({
            en: "Copyright © 2022-2023 Rafael Soh and Dime contributors. Modifications copyright © 2026 Daniel Esteves.",
            es: "Copyright © 2022-2023 Rafael Soh y colaboradores de Dime. Modificaciones copyright © 2026 Daniel Esteves.",
            fr: "Copyright © 2022-2023 Rafael Soh et les contributeurs de Dime. Modifications copyright © 2026 Daniel Esteves.",
            pt: "Copyright © 2022-2023 Rafael Soh e colaboradores do Dime. Modificações copyright © 2026 Daniel Esteves.",
        }),
        dimeRepo: t({
            en: "Dime (original project)",
            es: "Dime (proyecto original)",
            fr: "Dime (projet d'origine)",
            pt: "Dime (projeto original)",
        }),
        fork: t({
            en: "Outlayr is a modified version of Dime, forked in 2026 and changed since.",
            es: "Outlayr es una versión modificada de Dime: nació como fork en 2026 y ha cambiado desde entonces.",
            fr: "Outlayr est une version modifiée de Dime, issue d'un fork en 2026 et qui a évolué depuis.",
            pt: "O Outlayr é uma versão modificada do Dime: nasceu como fork em 2026 e mudou desde então.",
        }),
        gplLink: t({ en: "GPL-3.0 License", es: "Licencia GPL-3.0", fr: "Licence GPL-3.0", pt: "Licença GPL-3.0" }),
        intro: t({
            en: "Outlayr is open source and free forever. It is built on the foundation of Dime, a beautiful expense tracker created by Rafael Soh, and is distributed under the GNU General Public License v3.0.",
            es: "Outlayr es de código abierto y gratuito para siempre. Está basado en Dime, una hermosa app de gastos creada por Rafael Soh, y se distribuye bajo la GNU General Public License v3.0.",
            fr: "Outlayr est open source et gratuit pour toujours. Il s'appuie sur Dime, une superbe app de suivi des dépenses créée par Rafael Soh, et il est distribué sous la GNU General Public License v3.0.",
            pt: "O Outlayr é de código aberto e gratuito para sempre. É baseado no Dime, um lindo app de gastos criado por Rafael Soh, e é distribuído sob a GNU General Public License v3.0.",
        }),
        licence: t({ en: "Licence", es: "Licencia", fr: "Licence", pt: "Licença" }),
        links: t({ en: "Links", es: "Enlaces", fr: "Liens", pt: "Links" }),
        licenses: t({
            en: "Open source licenses",
            es: "Licencias de código abierto",
            fr: "Licences open source",
            pt: "Licenças de código aberto",
        }),
        outlayrRepo: t({
            en: "Outlayr on GitHub",
            es: "Outlayr en GitHub",
            fr: "Outlayr sur GitHub",
            pt: "Outlayr no GitHub",
        }),
        warranty: t({
            en: "Outlayr comes with ABSOLUTELY NO WARRANTY, to the extent permitted by law. You may redistribute it under the terms of the GNU General Public License v3.0.",
            es: "Outlayr se distribuye SIN NINGUNA GARANTÍA, en la medida permitida por la ley. Puedes redistribuirlo bajo los términos de la GNU General Public License v3.0.",
            fr: "Outlayr est fourni SANS AUCUNE GARANTIE, dans les limites permises par la loi. Vous pouvez le redistribuer selon les termes de la GNU General Public License v3.0.",
            pt: "O Outlayr vem SEM NENHUMA GARANTIA, na medida permitida pela lei. Você pode redistribuí-lo sob os termos da GNU General Public License v3.0.",
        }),
        share: t({
            en: "Share Outlayr",
            es: "Compartir Outlayr",
            fr: "Partager Outlayr",
            pt: "Compartilhar o Outlayr",
        }),
        followX: t({
            en: "Follow Outlayr on X",
            es: "Sigue a Outlayr en X",
            fr: "Suivre Outlayr sur X",
            pt: "Siga o Outlayr no X",
        }),
        featureLab: t({ en: "Feature lab", es: "Laboratorio de funciones", fr: "Labo", pt: "Laboratório de recursos" }),
        suggest: t({
            en: "Suggest a feature",
            es: "Sugerir una función",
            fr: "Suggérer une fonction",
            pt: "Sugerir um recurso",
        }),
        wish: t({
            en: "I wish Outlayr could",
            es: "Ojalá Outlayr pudiera",
            fr: "J'aimerais qu'Outlayr puisse",
            pt: "Queria que o Outlayr pudesse",
        }),
        reason: t({ en: "so I could", es: "para poder", fr: "pour pouvoir", pt: "para eu poder" }),
        notify: t({
            en: "Email me when it ships",
            es: "Avísame por correo cuando salga",
            fr: "Prévenez-moi par e-mail à sa sortie",
            pt: "Me avise por e-mail quando sair",
        }),
        privacy: t({
            en: "Sent with your app version, device and language. Never your entries.",
            es: "Se envía con tu versión de la app, dispositivo e idioma. Nunca tus registros.",
            fr: "Envoyé avec votre version de l'app, votre appareil et votre langue. Jamais vos opérations.",
            pt: "Enviado com a versão do app, o aparelho e o idioma. Nunca seus lançamentos.",
        }),
        send: t({ en: "Send", es: "Enviar", fr: "Envoyer", pt: "Enviar" }),
        sent: t({ en: "Sent. Thanks.", es: "Enviado. Gracias.", fr: "Envoyé. Merci.", pt: "Enviado. Obrigado." }),
        failed: t({
            en: "Couldn't send it. Check your connection and try again.",
            es: "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.",
            fr: "Envoi impossible. Vérifiez votre connexion et réessayez.",
            pt: "Não deu para enviar. Confira sua conexão e tente de novo.",
        }),
        rateLimited: t({
            en: "That's a lot of ideas for one hour. Try again later.",
            es: "Son muchas ideas para una hora. Inténtalo más tarde.",
            fr: "Beaucoup d'idées pour une heure. Réessayez plus tard.",
            pt: "São muitas ideias para uma hora. Tente mais tarde.",
        }),
        about: t({ en: "About", es: "Acerca de", fr: "À propos", pt: "Sobre" }),
        tabLicenses: t({ en: "Licenses", es: "Licencias", fr: "Licences", pt: "Licenças" }),
        copied: t({ en: "Link copied", es: "Enlace copiado", fr: "Lien copié", pt: "Link copiado" }),
        package: t({ en: "Package", es: "Paquete", fr: "Paquet", pt: "Pacote" }),
        versionColumn: t({ en: "Version", es: "Versión", fr: "Version", pt: "Versão" }),
        license: t({ en: "License", es: "Licencia", fr: "Licence", pt: "Licença" }),
        all: t({ en: "All", es: "Todas", fr: "Toutes", pt: "Todas" }),
        other: t({ en: "Other", es: "Otras", fr: "Autres", pt: "Outras" }),
        ofTotal: insert(
            t({
                en: "{{shown}} of {{total}}",
                es: "{{shown}} de {{total}}",
                fr: "{{shown}} sur {{total}}",
                pt: "{{shown}} de {{total}}",
            })
        ),
        showAll: t({ en: "Show all", es: "Mostrar todas", fr: "Tout afficher", pt: "Mostrar todas" }),
        noText: t({
            en: "No license text was published with this package.",
            es: "Este paquete no publicó texto de licencia.",
            fr: "Ce paquet n'a publié aucun texte de licence.",
            pt: "Este pacote não publicou texto de licença.",
        }),
        done: t({ en: "Done", es: "Listo", fr: "Terminé", pt: "Concluído" }),
        cancel: t({ en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" }),
        labAdding: t({
            en: "Adding a transaction",
            es: "Al añadir un movimiento",
            fr: "Ajout d'une transaction",
            pt: "Ao adicionar uma transação",
        }),
        labBudgets: t({ en: "Budgets", es: "Presupuestos", fr: "Budgets", pt: "Orçamentos" }),
        labLog: t({ en: "The Log", es: "El registro", fr: "Le journal", pt: "O registro" }),
        labRows: t({
            en: "Transaction rows",
            es: "Filas de movimientos",
            fr: "Lignes de transaction",
            pt: "Linhas de transação",
        }),
        version: insert(
            t({
                en: "Version {{version}}",
                es: "Versión {{version}}",
                fr: "Version {{version}}",
                pt: "Versão {{version}}",
            })
        ),
        echo: insert(
            t({
                en: "“I wish Outlayr could {{wish}}{{tail}}.”",
                es: "“Ojalá Outlayr pudiera {{wish}}{{tail}}.”",
                fr: "« J'aimerais qu'Outlayr puisse {{wish}}{{tail}}. »",
                pt: "“Queria que o Outlayr pudesse {{wish}}{{tail}}.”",
            })
        ),
        echoTail: insert(
            t({
                en: ", so I could {{reason}}",
                es: ", para poder {{reason}}",
                fr: ", pour pouvoir {{reason}}",
                pt: ", para eu poder {{reason}}",
            })
        ),
    },
    key: "dashboard-about",
} satisfies Dictionary;

export default dashboardAbout;
