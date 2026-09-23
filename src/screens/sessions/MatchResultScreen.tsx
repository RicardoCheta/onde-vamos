import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { getPlaceDetails } from '../../lib/googlePlaces';
import { openDirections } from '../../lib/maps';
import { upsertRestaurantDetails } from '../../lib/restaurants';
import { getMatchForSession, getSession } from '../../lib/sessions';
import { useTheme } from '../../theme/useTheme';
import type { RestaurantRow } from '../../types/database';
import type { Screen } from '../../navigation/types';

const PRICE_LABEL: Record<number, string> = { 0: 'Grátis', 1: '€', 2: '€€', 3: '€€€', 4: '€€€€' };

export default function MatchResultScreen({ route, navigation }: Screen<'MatchResult'>) {
  const { sessionId } = route.params;
  const { colors, spacing, radius } = useTheme();

  const [groupId, setGroupId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [session, result] = await Promise.all([getSession(sessionId), getMatchForSession(sessionId)]);
      if (cancelled || !result) return;
      setGroupId(session.group_id);
      setMatchId(result.match.id);
      setRestaurant(result.restaurant);

      try {
        const details = await getPlaceDetails(result.restaurant.google_place_id);
        const enriched = await upsertRestaurantDetails(details);
        if (!cancelled) setRestaurant(enriched);
      } catch (e) {
        console.warn('Não foi possível carregar detalhes extra do restaurante:', e);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!restaurant) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.headline}>🎉 Deu Match!</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
          Todos os participantes concordaram. Bom apetite!
        </Text>

        {restaurant.photo_url ? (
          <Image
            source={{ uri: restaurant.photo_url }}
            style={[styles.photo, { borderRadius: radius.lg }]}
            contentFit="cover"
          />
        ) : null}

        <Text style={[styles.name, { color: colors.text, marginTop: spacing.md }]}>{restaurant.name}</Text>
        <View style={styles.metaRow}>
          {restaurant.rating ? <Text style={{ color: colors.text, fontWeight: '600' }}>⭐ {restaurant.rating}</Text> : null}
          {restaurant.price_level !== null ? (
            <Text style={{ color: colors.text, fontWeight: '600' }}>{PRICE_LABEL[restaurant.price_level]}</Text>
          ) : null}
          {restaurant.vegetarian_friendly ? (
            <Text style={{ color: colors.like, fontWeight: '600' }}>🌱 Vegetarian friendly</Text>
          ) : null}
        </View>
        {restaurant.address ? (
          <Text style={{ color: colors.textSecondary, marginTop: spacing.sm }}>📍 {restaurant.address}</Text>
        ) : null}

        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Button
            label="Abrir direções"
            onPress={() => {
              if (restaurant.lat && restaurant.lng) openDirections(restaurant.lat, restaurant.lng, restaurant.name);
            }}
          />
          <Button
            label="Registar despesa deste jantar"
            variant="secondary"
            onPress={() => {
              if (!groupId) return;
              navigation.replace('CreateExpense', {
                groupId,
                sessionId,
                matchId: matchId ?? undefined,
                suggestedDescription: `Jantar no ${restaurant.name}`,
              });
            }}
          />
          <Button
            label="Voltar ao grupo"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  headline: { fontSize: 28, fontWeight: '800' },
  photo: { width: '100%', height: 220 },
  name: { fontSize: 24, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
});
