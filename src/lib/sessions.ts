import { supabase } from './supabase';
import { searchNearbyRestaurants } from './googlePlaces';
import { upsertRestaurants } from './restaurants';
import type { RestaurantRow, SessionFilters, SwipeSessionRow, UserRow } from '../types/database';

export interface CreateSessionParams {
  groupId: string;
  createdBy: string;
  city: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  filters: SessionFilters;
  participantIds: string[];
}

async function fetchAndAttachDeck(
  sessionId: string,
  params: { lat: number; lng: number; radiusMeters: number; filters: SessionFilters }
): Promise<number> {
  const places = await searchNearbyRestaurants({
    lat: params.lat,
    lng: params.lng,
    radiusMeters: params.radiusMeters,
    categoryKeywords: params.filters.categories,
    priceLevels: params.filters.price_levels,
  });

  const restaurants = await upsertRestaurants(places);
  if (restaurants.length === 0) return 0;

  const { data: existing } = await supabase
    .from('session_restaurants')
    .select('restaurant_id')
    .eq('session_id', sessionId);
  const existingIds = new Set((existing ?? []).map((r) => r.restaurant_id));

  const newOnes = restaurants.filter((r) => !existingIds.has(r.id));
  if (newOnes.length === 0) return 0;

  const startPosition = existingIds.size;
  const rows = newOnes.map((r, i) => ({
    session_id: sessionId,
    restaurant_id: r.id,
    position: startPosition + i,
  }));

  const { error } = await supabase.from('session_restaurants').insert(rows);
  if (error) throw error;
  return newOnes.length;
}

export async function createSession(params: CreateSessionParams): Promise<SwipeSessionRow> {
  const { data: session, error } = await supabase
    .from('swipe_sessions')
    .insert({
      group_id: params.groupId,
      created_by: params.createdBy,
      city: params.city,
      location_lat: params.lat,
      location_lng: params.lng,
      radius_meters: params.radiusMeters,
      filters: params.filters,
    })
    .select('*')
    .single();

  if (error) throw error;

  const participantRows = params.participantIds.map((userId) => ({
    session_id: session.id,
    user_id: userId,
  }));
  const { error: participantsError } = await supabase.from('session_participants').insert(participantRows);
  if (participantsError) throw participantsError;

  const deckSize = await fetchAndAttachDeck(session.id, {
    lat: params.lat,
    lng: params.lng,
    radiusMeters: params.radiusMeters,
    filters: params.filters,
  });

  if (deckSize === 0) {
    throw new Error(
      'Não encontrámos restaurantes com estes filtros. Tenta alargar o raio ou remover filtros.'
    );
  }

  return session;
}

export async function widenSessionSearch(session: SwipeSessionRow, extraRadiusMeters = 1500): Promise<number> {
  const newRadius = session.radius_meters + extraRadiusMeters;

  const { error } = await supabase
    .from('swipe_sessions')
    .update({ radius_meters: newRadius, status: 'active', ended_at: null })
    .eq('id', session.id);
  if (error) throw error;

  return fetchAndAttachDeck(session.id, {
    lat: session.location_lat,
    lng: session.location_lng,
    radiusMeters: newRadius,
    filters: session.filters,
  });
}

export async function getSession(sessionId: string): Promise<SwipeSessionRow> {
  const { data, error } = await supabase.from('swipe_sessions').select('*').eq('id', sessionId).single();
  if (error) throw error;
  return data;
}

export async function getSessionParticipants(sessionId: string): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('session_participants')
    .select('users(*)')
    .eq('session_id', sessionId);
  if (error) throw error;
  return (data ?? []).map((row: any) => row.users);
}

// Baralho de cartas por ordem, ainda por decidir pelo utilizador
export async function getRemainingDeck(sessionId: string, userId: string): Promise<RestaurantRow[]> {
  const { data: deck, error } = await supabase
    .from('session_restaurants')
    .select('position, restaurants(*)')
    .eq('session_id', sessionId)
    .order('position', { ascending: true });
  if (error) throw error;

  const { data: swiped, error: swipedError } = await supabase
    .from('swipes')
    .select('restaurant_id')
    .eq('session_id', sessionId)
    .eq('user_id', userId);
  if (swipedError) throw swipedError;

  const swipedIds = new Set((swiped ?? []).map((s) => s.restaurant_id));
  return (deck ?? [])
    .map((row: any) => row.restaurants as RestaurantRow)
    .filter((r) => !swipedIds.has(r.id));
}

export async function getMatchForSession(sessionId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select('*, restaurants(*)')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { restaurants, ...match } = data as any;
  return { match, restaurant: restaurants as RestaurantRow };
}

export async function recordSwipe(sessionId: string, userId: string, restaurantId: string, liked: boolean) {
  const { error } = await supabase
    .from('swipes')
    .insert({ session_id: sessionId, user_id: userId, restaurant_id: restaurantId, liked });
  if (error) throw error;
}

export async function listGroupSessions(groupId: string): Promise<SwipeSessionRow[]> {
  const { data, error } = await supabase
    .from('swipe_sessions')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

export async function getActiveSessionForGroup(groupId: string): Promise<SwipeSessionRow | null> {
  const { data, error } = await supabase
    .from('swipe_sessions')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
