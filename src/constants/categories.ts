export interface FoodCategory {
  id: string;
  label: string;
  keyword: string;
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  { id: 'portuguesa', label: 'Portuguesa', keyword: 'comida portuguesa' },
  { id: 'italiana', label: 'Italiana', keyword: 'italiano' },
  { id: 'japonesa', label: 'Japonesa / Sushi', keyword: 'sushi japones' },
  { id: 'hamburgueres', label: 'Hambúrgueres', keyword: 'hamburgueria' },
  { id: 'pizza', label: 'Pizza', keyword: 'pizzaria' },
  { id: 'marisco', label: 'Marisqueira', keyword: 'marisqueira' },
  { id: 'vegetariana', label: 'Vegetariana / Vegan', keyword: 'vegetariano vegan' },
  { id: 'asiatica', label: 'Asiática', keyword: 'comida asiatica' },
  { id: 'saudavel', label: 'Saudável / Poke', keyword: 'poke saudavel' },
  { id: 'tapas', label: 'Petiscos / Tapas', keyword: 'petiscos tapas' },
];

export const PRICE_LEVELS = [
  { level: 1, label: '€' },
  { level: 2, label: '€€' },
  { level: 3, label: '€€€' },
] as const;

export const PORTUGAL_CITIES = [
  { label: 'Lisboa', lat: 38.7223, lng: -9.1393 },
  { label: 'Porto', lat: 41.1579, lng: -8.6291 },
] as const;
