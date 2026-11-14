const DIACRITICS = /\p{Diacritic}/gu;

export const fold = (text: string) => text.normalize("NFD").replaceAll(DIACRITICS, "").toLowerCase();
