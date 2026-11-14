import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const content = {
    content: {
        bonus: t({ en: "Bonus", es: "Bonos", fr: "Primes", pt: "Bônus" }),
        business: t({ en: "Business", es: "Negocio", fr: "Entreprise", pt: "Negócio" }),
        coffee: t({ en: "Coffee", es: "Café", fr: "Café", pt: "Café" }),
        diningOut: t({ en: "Dining Out", es: "Restaurantes", fr: "Restaurants", pt: "Restaurantes" }),
        education: t({ en: "Education", es: "Educación", fr: "Éducation", pt: "Educação" }),
        entertainment: t({ en: "Entertainment", es: "Entretenimiento", fr: "Loisirs", pt: "Lazer" }),
        family: t({ en: "Family", es: "Familia", fr: "Famille", pt: "Família" }),
        fashion: t({ en: "Fashion", es: "Ropa", fr: "Vêtements", pt: "Roupas" }),
        fitness: t({ en: "Fitness", es: "Deporte", fr: "Sport", pt: "Academia" }),
        freelance: t({ en: "Freelance", es: "Freelance", fr: "Freelance", pt: "Freelance" }),
        fuel: t({ en: "Fuel", es: "Gasolina", fr: "Carburant", pt: "Combustível" }),
        gifts: t({ en: "Gifts", es: "Regalos", fr: "Cadeaux", pt: "Presentes" }),
        groceries: t({ en: "Groceries", es: "Supermercado", fr: "Courses", pt: "Mercado" }),
        healthcare: t({ en: "Healthcare", es: "Salud", fr: "Santé", pt: "Saúde" }),
        home: t({ en: "Home", es: "Hogar", fr: "Maison", pt: "Casa" }),
        insurance: t({ en: "Insurance", es: "Seguros", fr: "Assurances", pt: "Seguros" }),
        interest: t({ en: "Interest", es: "Intereses", fr: "Intérêts", pt: "Juros" }),
        investments: t({ en: "Investments", es: "Inversiones", fr: "Investissements", pt: "Investimentos" }),
        partTime: t({ en: "Part-Time", es: "Medio tiempo", fr: "Temps partiel", pt: "Meio período" }),
        paycheck: t({ en: "Paycheck", es: "Sueldo", fr: "Salaire", pt: "Salário" }),
        personalCare: t({
            en: "Personal Care",
            es: "Cuidado personal",
            fr: "Soins personnels",
            pt: "Cuidados pessoais",
        }),
        pets: t({ en: "Pets", es: "Mascotas", fr: "Animaux", pt: "Pets" }),
        phoneInternet: t({
            en: "Phone & Internet",
            es: "Teléfono e internet",
            fr: "Téléphone et internet",
            pt: "Celular e internet",
        }),
        refund: t({ en: "Refund", es: "Reembolsos", fr: "Remboursements", pt: "Reembolsos" }),
        rent: t({ en: "Rent", es: "Renta", fr: "Loyer", pt: "Aluguel" }),
        shopping: t({ en: "Shopping", es: "Compras", fr: "Achats", pt: "Compras" }),
        subscriptions: t({ en: "Subscriptions", es: "Suscripciones", fr: "Abonnements", pt: "Assinaturas" }),
        taxes: t({ en: "Taxes", es: "Impuestos", fr: "Impôts", pt: "Impostos" }),
        tips: t({ en: "Tips", es: "Propinas", fr: "Pourboires", pt: "Gorjetas" }),
        transport: t({ en: "Transport", es: "Transporte", fr: "Transports", pt: "Transporte" }),
        travel: t({ en: "Travel", es: "Viajes", fr: "Voyages", pt: "Viagens" }),
        utilities: t({ en: "Utilities", es: "Servicios", fr: "Charges", pt: "Contas da casa" }),
    },
    key: "category-presets",
} satisfies Dictionary;

export default content;
