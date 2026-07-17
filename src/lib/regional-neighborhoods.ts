// Bairros regionais — usados em endereços e filtros de busca para todas as regiões pre-configuradas

export const MAPUTO_NEIGHBORHOODS = [
  "Polana Cimento A", "Polana Cimento B", "Polana Caniço", "Sommerschield", "Coop",
  "Alto-Maé A", "Alto-Maé B", "Malhangalene A", "Malhangalene B", "Central A",
  "Central B", "Central C", "Maxaquene A", "Maxaquene B", "Maxaquene C", "Maxaquene D",
  "Mafalala", "Chamanculo A", "Chamanculo B", "Chamanculo C", "Chamanculo D",
  "Xipamanine", "Aeroporto A", "Aeroporto B", "Costa do Sol", "Triunfo", "FPLM",
  "Hulene A", "Hulene B", "Mavalane A", "Mavalane B", "Laulane", "3 de Fevereiro",
  "Magoanine A", "Magoanine B", "Magoanine C", "Zimpeto", "Inhagoia A", "Inhagoia B",
  "Jardim", "Bagamoyo", "Luís Cabral", "Albazine", "Catembe", "Ka Tembe",
] as const;

export const MATOLA_NEIGHBORHOODS = [
  "Matola A", "Matola B", "Matola C", "Matola D", "Matola F", "Matola Gare",
  "Machava", "Machava Sede", "Infulene", "Liberdade", "Tsalala", "Boquisso",
  "Singathela", "Khongolote", "Ndlavela", "Patrice Lumumba",
] as const;

export const BEIRA_NEIGHBORHOODS = [
  "Ponta Gêa", "Macuti", "Esturro", "Chaimite", "Munhava", "Matacuane",
  "Vaz", "Goto", "Manga", "Inhamizua",
] as const;

export const NAMPULA_NEIGHBORHOODS = [
  "Central", "Muahivire", "Muhala", "Namicopo", "Carrupeia", "Napipine", "Natikiri",
] as const;

export const LUANDA_NEIGHBORHOODS = [
  "Ingombota", "Maianga", "Alvalade", "Miramar", "Talatona", "Benfica",
  "Kilamba", "Sambizanga", "Rangel", "Cazenga", "Viana",
] as const;

export const SAO_PAULO_NEIGHBORHOODS = [
  "Vila Mariana", "Pinheiros", "Itaim Bibi", "Jardins", "Moema", "Perdizes",
  "Bela Vista", "Santana", "Tatuapé", "Mooca", "Butantã",
] as const;

export const JOHANNESBURG_NEIGHBORHOODS = [
  "Sandton", "Rosebank", "Soweto", "Randburg", "Midrand", "Braamfontein",
  "Mellville", "Parkhurst", "Fourways",
] as const;

export const LISBOA_NEIGHBORHOODS = [
  "Arroios", "Benfica", "Belém", "Campo de Ourique", "Estrela", "Misericórdia",
  "Parque das Nações", "Santo António", "Alvalade",
] as const;

export const MUMBAI_NEIGHBORHOODS = [
  "Andheri", "Bandra", "Colaba", "Juhu", "Worli", "Powai", "Malad", "Borivali",
] as const;

export function getNeighborhoodsForCity(city: string): string[] {
  switch (city) {
    // Moçambique
    case "Maputo": return [...MAPUTO_NEIGHBORHOODS];
    case "Matola": return [...MATOLA_NEIGHBORHOODS];
    case "Beira": return [...BEIRA_NEIGHBORHOODS];
    case "Nampula": return [...NAMPULA_NEIGHBORHOODS];

    // Angola
    case "Luanda": return [...LUANDA_NEIGHBORHOODS];

    // Brasil
    case "São Paulo": return [...SAO_PAULO_NEIGHBORHOODS];

    // África do Sul
    case "Johannesburg": return [...JOHANNESBURG_NEIGHBORHOODS];

    // Portugal
    case "Lisboa": return [...LISBOA_NEIGHBORHOODS];

    // Índia
    case "Mumbai": return [...MUMBAI_NEIGHBORHOODS];

    default: return [];
  }
}
