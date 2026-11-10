import { insert, t } from "intlayer";
import type { Dictionary } from "intlayer";

const blog = {
    content: {
        lead: t({
            en: "What shipped in Outlayr, why, and what it cost. Written by Daniel Esteves.",
            es: "Lo que salió en Outlayr, por qué y cuánto costó. Escrito por Daniel Esteves.",
        }),
        meta: {
            title: t({
                en: "Outlayr build log: how an open source expense app gets made",
                es: "Bitácora de Outlayr: cómo se hace una app de código abierto",
            }),
        },
        minutes: insert(t({ en: "{{minutes}} min read", es: "{{minutes}} min de lectura" })),
        next: t({ en: "Keep reading", es: "Sigue leyendo" }),
        shipped: t({ en: "Shipped in", es: "Salió en" }),
        title: t({ en: "Build log", es: "Bitácora" }),
    },
    key: "blog",
} satisfies Dictionary;

export default blog;
