import { supabase } from './supabase';
import type { NearbyPlace, PlaceDetails } from './googlePlaces';
import type { RestaurantRow } from '../types/database';

// Guarda (ou atualiza) os resultados da Google Places API na cache local,
// evitando pedidos repetidos à API para o mesmo restaurante.
export async function upsertRestaurants(places: NearbyPlace[]): Promise<RestaurantRow[]> {
  if (places.length === 0) return [];

  const rows = places.map((p) => ({
    google_place_id: p.google_place_id,
    name: p.name,
    address: p.address,
    category: p.category,
    price_level: p.price_level,
    rating: p.rating,
    photo_url: p.photo_url,
    lat: p.lat,
    lng: p.lng,
  }));

  const { data, error } = await supabase
    .from('restaurants')
    .upsert(rows, { onConflict: 'google_place_id' })
    .select('*');

  if (error) throw error;
  return data ?? [];
}

export async function upsertRestaurantDetails(details: PlaceDetails): Promise<RestaurantRow> {
  const { data, error } = await supabase
    .from('restaurants')
    .upsert(
      {
        google_place_id: details.google_place_id,
        name: details.name,
        address: details.address,
        category: details.category,
        price_level: details.price_level,
        rating: details.rating,
        photo_url: details.photo_url,
        lat: details.lat,
        lng: details.lng,
        vegetarian_friendly: details.vegetarian_friendly,
      },
      { onConflict: 'google_place_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getRestaurant(restaurantId: string): Promise<RestaurantRow> {
  const { data, error } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
  if (error) throw error;
  return data;
}
