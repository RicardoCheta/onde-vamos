// Integração com a Google Places API (Legacy): Nearby Search + Place Details.
// Docs: https://developers.google.com/maps/documentation/places/web-service/search-nearby

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

export interface NearbyPlace {
  google_place_id: string;
  name: string;
  address: string | null;
  category: string | null;
  price_level: number | null;
  rating: number | null;
  photo_url: string | null;
  lat: number;
  lng: number;
}

export interface PlaceDetails extends NearbyPlace {
  vegetarian_friendly: boolean | null;
  google_maps_url: string | null;
  phone: string | null;
}

function photoUrl(photoReference: string | undefined, maxWidth = 800): string | null {
  if (!photoReference || !API_KEY) return null;
  return `${BASE_URL}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${API_KEY}`;
}

function friendlyCategory(types: string[] | undefined): string | null {
  if (!types) return null;
  const ignore = new Set(['point_of_interest', 'establishment', 'food']);
  const relevant = types.find((t) => !ignore.has(t));
  if (!relevant) return 'restaurante';
  return relevant.replace(/_/g, ' ');
}

function mapResult(result: any): NearbyPlace {
  return {
    google_place_id: result.place_id,
    name: result.name,
    address: result.vicinity ?? null,
    category: friendlyCategory(result.types),
    price_level: typeof result.price_level === 'number' ? result.price_level : null,
    rating: typeof result.rating === 'number' ? result.rating : null,
    photo_url: photoUrl(result.photos?.[0]?.photo_reference),
    lat: result.geometry?.location?.lat,
    lng: result.geometry?.location?.lng,
  };
}

export interface NearbySearchParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  categoryKeywords?: string[]; // ex: ['italiano', 'sushi japones']
  priceLevels?: number[]; // 0-4
}

export async function searchNearbyRestaurants({
  lat,
  lng,
  radiusMeters,
  categoryKeywords,
  priceLevels,
}: NearbySearchParams): Promise<NearbyPlace[]> {
  if (!API_KEY) {
    throw new Error(
      'Falta a variável EXPO_PUBLIC_GOOGLE_PLACES_API_KEY. Define-a no ficheiro .env.'
    );
  }

  const minprice = priceLevels && priceLevels.length > 0 ? Math.min(...priceLevels) : undefined;
  const maxprice = priceLevels && priceLevels.length > 0 ? Math.max(...priceLevels) : undefined;

  const keywords = categoryKeywords && categoryKeywords.length > 0 ? categoryKeywords : [undefined];
  const allResults = new Map<string, NearbyPlace>();

  for (const keyword of keywords) {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(radiusMeters),
      type: 'restaurant',
      key: API_KEY,
    });
    if (keyword) params.set('keyword', keyword);
    if (minprice !== undefined) params.set('minprice', String(minprice));
    if (maxprice !== undefined) params.set('maxprice', String(maxprice));

    const response = await fetch(`${BASE_URL}/nearbysearch/json?${params.toString()}`);
    const json = await response.json();

    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places devolveu um erro: ${json.status} ${json.error_message ?? ''}`.trim());
    }

    for (const result of json.results ?? []) {
      if (!result.geometry?.location) continue;
      const place = mapResult(result);
      // Filtra ao nível exato de preço pedido (a API só suporta um intervalo contínuo)
      if (priceLevels && priceLevels.length > 0 && place.price_level !== null) {
        if (!priceLevels.includes(place.price_level)) continue;
      }
      allResults.set(place.google_place_id, place);
    }
  }

  return Array.from(allResults.values());
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  if (!API_KEY) {
    throw new Error(
      'Falta a variável EXPO_PUBLIC_GOOGLE_PLACES_API_KEY. Define-a no ficheiro .env.'
    );
  }

  const fields = [
    'name',
    'formatted_address',
    'geometry',
    'photo',
    'price_level',
    'rating',
    'type',
    'url',
    'international_phone_number',
    'serves_vegetarian_food',
  ].join(',');

  const params = new URLSearchParams({ place_id: placeId, fields, key: API_KEY });
  const response = await fetch(`${BASE_URL}/details/json?${params.toString()}`);
  const json = await response.json();

  if (json.status !== 'OK') {
    throw new Error(`Google Places devolveu um erro: ${json.status} ${json.error_message ?? ''}`.trim());
  }

  const result = json.result;
  return {
    google_place_id: placeId,
    name: result.name,
    address: result.formatted_address ?? null,
    category: friendlyCategory(result.types),
    price_level: typeof result.price_level === 'number' ? result.price_level : null,
    rating: typeof result.rating === 'number' ? result.rating : null,
    photo_url: photoUrl(result.photos?.[0]?.photo_reference),
    lat: result.geometry?.location?.lat,
    lng: result.geometry?.location?.lng,
    vegetarian_friendly:
      typeof result.serves_vegetarian_food === 'boolean' ? result.serves_vegetarian_food : null,
    google_maps_url: result.url ?? null,
    phone: result.international_phone_number ?? null,
  };
}
