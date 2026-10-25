import { t } from "intlayer";
import type { Dictionary } from "intlayer";

const categories = {
    content: {
        "categories.a11y.hideSuggestions": t({
            en: "Hide suggestions",
            es: "Ocultar sugerencias",
            pt: "Ocultar sugestões",
        }),
        "categories.a11y.new": t({
            en: "New category",
            es: "Nueva categoría",
            pt: "Nova categoria",
        }),
        "categories.a11y.reorder": t({
            en: "Reorder categories",
            es: "Reordenar categorías",
            pt: "Reordenar categorias",
        }),
        "categories.a11y.showSuggestions": t({
            en: "Show suggestions",
            es: "Mostrar sugerencias",
            pt: "Mostrar sugestões",
        }),
        "categories.addCategory": t({
            en: "Add Category",
            es: "Agregar categoría",
            pt: "Adicionar categoria",
        }),
        "categories.addSubcategory": t({
            en: "Add Subcategory",
            es: "Agregar subcategoría",
            pt: "Adicionar subcategoria",
        }),
        "categories.census.categories_one": t({
            en: "{count} category",
            es: "{count} categoría",
            pt: "{count} categoria",
        }),
        "categories.census.categories_other": t({
            en: "{count} categories",
            es: "{count} categorías",
            pt: "{count} categorias",
        }),
        "categories.census.subcategories_one": t({
            en: "{count} subcategory",
            es: "{count} subcategoría",
            pt: "{count} subcategoria",
        }),
        "categories.census.subcategories_other": t({
            en: "{count} subcategories",
            es: "{count} subcategorías",
            pt: "{count} subcategorias",
        }),
        "categories.empty.expense": t({
            en: "No expense categories found, click the ‘New’ button to add some",
            es: "Aún no hay categorías de gasto. Toca + para agregar una.",
            pt: "Ainda não há categorias de despesa. Toque em + para adicionar uma.",
        }),
        "categories.empty.income": t({
            en: "No income categories found, click the ‘New’ button to add some",
            es: "Aún no hay categorías de ingreso. Toca + para agregar una.",
            pt: "Ainda não há categorias de receita. Toque em + para adicionar uma.",
        }),
        "categories.error.deleteTitle": t({
            en: "Couldn't Delete Category",
            es: "No se pudo eliminar la categoría",
            pt: "Não foi possível apagar a categoria",
        }),
        "categories.error.duplicate": t({
            en: "A category with this symbol and name already exists.",
            es: "Ya existe una categoría con este símbolo y nombre.",
            pt: "Já existe uma categoria com este símbolo e nome.",
        }),
        "categories.error.duplicateEmoji": t({
            en: "Another category already uses this emoji.",
            es: "Otra categoría ya usa este emoji.",
            pt: "Outra categoria já usa este emoji.",
        }),
        "categories.error.duplicateIcon": t({
            en: "Another category already uses this icon.",
            es: "Otra categoría ya usa este ícono.",
            pt: "Outra categoria já usa este ícone.",
        }),
        "categories.error.duplicateName": t({
            en: "Another category already uses this name.",
            es: "Otra categoría ya usa este nombre.",
            pt: "Outra categoria já usa este nome.",
        }),
        "categories.error.generic": t({
            en: "Please try again.",
            es: "Inténtalo de nuevo.",
            pt: "Tente de novo.",
        }),
        "categories.error.incomplete": t({
            en: "Please choose an icon or emoji, and a name.",
            es: "Elige un ícono o emoji, y un nombre.",
            pt: "Escolha um ícone ou emoji e um nome.",
        }),
        "categories.error.missingIcon": t({
            en: "Please choose an icon or emoji for the category.",
            es: "Elige un ícono o emoji para la categoría.",
            pt: "Escolha um ícone ou emoji para a categoria.",
        }),
        "categories.error.missingName": t({
            en: "Please enter a name for this category.",
            es: "Ingresa un nombre para esta categoría.",
            pt: "Digite um nome para esta categoria.",
        }),
        "categories.field.name": t({
            en: "Name",
            es: "Nombre",
            pt: "Nome",
        }),
        "categories.field.type": t({
            en: "Type",
            es: "Tipo",
            pt: "Tipo",
        }),
        "categories.incomeColorNote": t({
            en: "Income categories use the income color.",
            es: "Las categorías de ingreso usan el color de ingreso.",
            pt: "Categorias de receita usam a cor de receita.",
        }),
        "categories.inherits": t({
            en: "Inherits {parent}'s color.",
            es: "Usa el color de {parent}.",
            pt: "Usa a cor de {parent}.",
        }),
        "categories.kind.category": t({
            en: "Category",
            es: "Categoría",
            pt: "Categoria",
        }),
        "categories.kind.expense": t({
            en: "Expense Category",
            es: "Categoría de gasto",
            pt: "Categoria de despesa",
        }),
        "categories.kind.income": t({
            en: "Income Category",
            es: "Categoría de ingreso",
            pt: "Categoria de receita",
        }),
        "categories.kind.subcategory": t({
            en: "Subcategory",
            es: "Subcategoría",
            pt: "Subcategoria",
        }),
        "categories.namePlaceholder.expense": t({
            en: "Groceries, Rent…",
            es: "Súper, Renta…",
            pt: "Mercado, Aluguel…",
        }),
        "categories.namePlaceholder.income": t({
            en: "Salary, Freelance…",
            es: "Sueldo, Freelance…",
            pt: "Salário, Freela…",
        }),
        "categories.namePlaceholder.subcategory": t({
            en: "Coffee, Snacks…",
            es: "Café, Botanas…",
            pt: "Café, Lanches…",
        }),
        "categories.reorderTitle": t({
            en: "Reorder Categories",
            es: "Reordenar categorías",
            pt: "Reordenar categorias",
        }),
        "categories.saveCategory": t({
            en: "Save Category",
            es: "Guardar categoría",
            pt: "Salvar categoria",
        }),
        "categories.saveSubcategory": t({
            en: "Save Subcategory",
            es: "Guardar subcategoría",
            pt: "Salvar subcategoria",
        }),
        "categories.suggested.eyebrow": t({
            en: "Suggested · {count}",
            es: "Sugeridas · {count}",
            pt: "Sugeridas · {count}",
        }),
        "categories.title": t({
            en: "Categories",
            es: "Categorías",
            pt: "Categorias",
        }),
        "categories.toast.added": t({
            en: "Category added",
            es: "Categoría agregada",
            pt: "Categoria adicionada",
        }),
        "categories.undo.body": t({
            en: "Its transactions go with it.",
            es: "Sus transacciones se borran con ella.",
            pt: "Os lançamentos dela vão junto.",
        }),
        "categories.undo.bodyWithChildren": t({
            en: "Its transactions go with it; its subcategories move to the top level.",
            es: "Sus transacciones se borran con ella; sus subcategorías pasan al nivel superior.",
            pt: "Os lançamentos dela vão junto; as subcategorias passam para o nível principal.",
        }),
        "categories.undo.deleted": t({
            en: "Category deleted",
            es: "Categoría eliminada",
            pt: "Categoria apagada",
        }),
    },
    key: "categories" as const,
} satisfies Dictionary;

export default categories;
