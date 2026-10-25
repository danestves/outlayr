import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const settingsFeatureLab = {
    content: {
        "settings.featureLab.addingSection": t({
            en: "Adding a transaction",
            es: "Al agregar una transacción",
            "es-ES": "Al añadir una transacción",
            pt: "Ao adicionar um lançamento",
        }),
        "settings.featureLab.aiEnrichment": t({
            en: "Suggest category and tags",
            es: "Sugerir categoría y etiquetas",
            pt: "Sugerir categoria e tags",
        }),
        "settings.featureLab.aiEnrichmentNote": t({
            en: "Well-known services are recognised on this device, and only their web address goes to a logo service to fetch the logo. For anything else, only the merchant name of an entry (typed, spoken, scanned or logged from Wallet), whether it is an expense or income, its currency code, your language and device region, and your own category names leave the device, never amounts, dates or accounts, and the web address that comes back goes to the same logo service. A recent entry saved without a logo is looked up again in the background.",
            es: "Los servicios conocidos se reconocen en este dispositivo, y solo su dirección web va a un servicio de logos para traer el logo. Para todo lo demás, solo salen del dispositivo el nombre del comercio de una entrada (escrita, dictada, escaneada o registrada desde Wallet), si es gasto o ingreso, su código de moneda, tu idioma y la región del dispositivo, y los nombres de tus categorías. Nunca montos, fechas ni cuentas. La dirección web que vuelve va al mismo servicio de logos. Si una entrada reciente se guardó sin logo, se vuelve a buscar en segundo plano.",
            "es-ES":
                "Los servicios conocidos se reconocen en este dispositivo, y solo su dirección web va a un servicio de logos para traer el logo. Para todo lo demás, solo salen del dispositivo el nombre del comercio de una entrada (escrita, dictada, escaneada o registrada desde Cartera), si es gasto o ingreso, su código de moneda, tu idioma y la región del dispositivo, y los nombres de tus categorías. Nunca importes, fechas ni cuentas. La dirección web que vuelve va al mismo servicio de logos. Si una entrada reciente se guardó sin logo, se vuelve a buscar en segundo plano.",
            pt: "Serviços conhecidos são reconhecidos neste dispositivo, e só o endereço web deles vai para um serviço de logos para buscar o logo. Para todo o resto, só saem do dispositivo o nome do estabelecimento de um lançamento (digitado, falado, escaneado ou registrado pela Carteira), se é despesa ou receita, o código da moeda, seu idioma e a região do dispositivo, e os nomes das suas categorias. Nunca valores, datas ou contas. O endereço web que volta vai para o mesmo serviço de logos. Se um lançamento recente foi salvo sem logo, ele é buscado de novo em segundo plano.",
        }),
        "settings.featureLab.aiSection": t({
            en: "Smart fill",
            es: "Autocompletado",
            pt: "Preenchimento inteligente",
        }),
        "settings.featureLab.budgetRows": t({
            en: "Budget rows",
            es: "Filas de presupuesto",
            pt: "Orçamentos em linhas",
        }),
        "settings.featureLab.budgetRowsNote": t({
            en: "Off lays the budgets out as a two-up grid of cards instead of a list.",
            es: "Si lo desactivas, los presupuestos se muestran en una cuadrícula de tarjetas de dos en dos en vez de una lista.",
            pt: "Se desativado, os orçamentos aparecem em uma grade de cartões, dois por linha, em vez de uma lista.",
        }),
        "settings.featureLab.budgetsSection": t({
            en: "Budgets",
            es: "Presupuestos",
            pt: "Orçamentos",
        }),
        "settings.featureLab.confetti": t({
            en: "Celebrate expenses",
            es: "Celebrar gastos",
            pt: "Celebrar despesas",
        }),
        "settings.featureLab.confettiNote": t({
            en: "Throws confetti over a transaction the moment you add it.",
            es: "Lanza confeti sobre una transacción en el momento en que la agregas.",
            "es-ES": "Lanza confeti sobre una transacción en el momento en que la añades.",
            pt: "Joga confete sobre um lançamento assim que você o adiciona.",
        }),
        "settings.featureLab.experimental": t({
            en: "Experimental: these can change or disappear.",
            es: "Experimental: esto puede cambiar o desaparecer.",
            pt: "Experimental: isto pode mudar ou desaparecer.",
        }),
        "settings.featureLab.groundedLookup": t({
            en: "Look up new merchants",
            es: "Buscar comercios nuevos",
            pt: "Buscar estabelecimentos novos",
        }),
        "settings.featureLab.groundedLookupNote": t({
            en: "For a merchant nobody has seen before, the name, whether it is an expense or income, the entry's currency code and your language and device region may be searched on the web to learn its category, never on the transaction you're entering, and never with any amount, date or account. Off keeps every lookup on this device and the ones already known.",
            es: "Para un comercio que nadie ha visto antes, el nombre, si es gasto o ingreso, el código de moneda de la entrada y tu idioma y región pueden buscarse en la web para conocer su categoría. Nunca para la transacción que estás ingresando y nunca con montos, fechas ni cuentas. Si lo desactivas, cada búsqueda se queda en este dispositivo y en los comercios ya conocidos.",
            "es-ES":
                "Para un comercio que nadie ha visto antes, el nombre, si es gasto o ingreso, el código de moneda de la entrada y tu idioma y región pueden buscarse en la web para conocer su categoría. Nunca para la transacción que estás introduciendo y nunca con importes, fechas ni cuentas. Si lo desactivas, cada búsqueda se queda en este dispositivo y en los comercios ya conocidos.",
            pt: "Para um estabelecimento que ninguém viu antes, o nome, se é despesa ou receita, o código da moeda do lançamento, seu idioma e a região do dispositivo podem ser buscados na web para descobrir a categoria. Nunca para o lançamento que você está registrando e nunca com valores, datas ou contas. Se desativado, cada busca fica restrita a este dispositivo e aos estabelecimentos já conhecidos.",
        }),
        "settings.featureLab.lineGraph": t({
            en: "Show line graph",
            es: "Mostrar gráfico de líneas",
            pt: "Mostrar gráfico de linha",
        }),
        "settings.featureLab.logSection": t({
            en: "The Log",
            es: "El registro",
            pt: "Lançamentos",
        }),
        "settings.featureLab.swapTime": t({
            en: "Replace time label",
            es: "Reemplazar etiqueta de hora",
            pt: "Trocar o horário pela categoria",
        }),
        "settings.featureLab.swapTimeNote": t({
            en: "Each transaction shows its category instead of its time. If you never write your own note, the note is already the category name, so both lines will read the same.",
            es: "Cada transacción muestra su categoría en vez de su hora. Si nunca escribes tu propia nota, la nota ya es el nombre de la categoría, así que ambas líneas dirán lo mismo.",
            pt: "Cada lançamento mostra a categoria em vez do horário. Se você nunca escreve uma nota própria, a nota já é o nome da categoria, então as duas linhas vão dizer o mesmo.",
        }),
        "settings.featureLab.transactionRowsSection": t({
            en: "Transaction rows",
            es: "Filas de transacción",
            pt: "Linhas de lançamento",
        }),
        "settings.featureLab.aiProvidersNote": t({
            en: "Both go to Claude, made by Anthropic, and only while Send data to AI providers is on in Settings.",
            es: "Ambas van a Claude, de Anthropic, y solo mientras Enviar datos a proveedores de IA esté activado en Configuración.",
            "es-ES":
                "Ambas van a Claude, de Anthropic, y solo mientras Enviar datos a proveedores de IA esté activado en Ajustes.",
            pt: "As duas buscas vão para o Claude, da Anthropic, e só enquanto Enviar dados a provedores de IA estiver ativado em Ajustes.",
        }),
    },
    key: "settings-feature-lab" as const,
} satisfies Dictionary;

export default settingsFeatureLab;
