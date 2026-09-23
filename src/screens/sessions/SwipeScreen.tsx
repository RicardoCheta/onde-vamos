import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RestaurantCard } from '../../components/RestaurantCard';
import { EmptyState } from '../../components/EmptyState';
import {
  getRemainingDeck,
  getSession,
  getSessionParticipants,
  recordSwipe,
} from '../../lib/sessions';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import type { RestaurantRow } from '../../types/database';
import type { Screen } from '../../navigation/types';

export default function SwipeScreen({ route, navigation }: Screen<'Swipe'>) {
  const { sessionId } = route.params;
  const { colors, spacing } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [deck, setDeck] = useState<RestaurantRow[] | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [liveResponders, setLiveResponders] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigatedAway = useRef(false);

  const loadResponderCount = useCallback(
    async (restaurantId: string) => {
      const { count } = await supabase
        .from('swipes')
        .select('user_id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('restaurant_id', restaurantId);
      setLiveResponders(count ?? 0);
    },
    [sessionId]
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const [participants, remaining] = await Promise.all([
        getSessionParticipants(sessionId),
        getRemainingDeck(sessionId, userId),
      ]);
      if (cancelled) return;
      setParticipantCount(participants.length || 1);
      setDeck(remaining);
      if (remaining[0]) loadResponderCount(remaining[0].id);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, userId, loadResponderCount]);

  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'swipe_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new.status === 'matched' && !navigatedAway.current) {
            navigatedAway.current = true;
            navigation.replace('MatchResult', { sessionId });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'swipes', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setDeck((current) => {
            const topId = current?.[0]?.id;
            if (topId && payload.new.restaurant_id === topId) {
              loadResponderCount(topId);
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, navigation, loadResponderCount]);

  async function handleSwipe(liked: boolean) {
    if (!userId || !deck || deck.length === 0 || loading) return;
    const [top, ...rest] = deck;
    setLoading(true);
    try {
      await recordSwipe(sessionId, userId, top.id, liked);
      setDeck(rest);
      if (rest[0]) loadResponderCount(rest[0].id);

      if (rest.length === 0) {
        // Dá tempo ao trigger de match chegar por Realtime antes de assumir "sem match"
        setTimeout(() => {
          if (!navigatedAway.current) {
            navigatedAway.current = true;
            navigation.replace('NoMatch', { sessionId });
          }
        }, 1200);
      }
    } catch (e) {
      console.warn('Erro ao registar swipe:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.text, fontSize: 16 }}>Fechar</Text>
        </Pressable>
        <Text style={{ color: colors.textSecondary }}>{deck?.length ?? 0} por decidir</Text>
      </View>

      <View style={[styles.deckArea, { padding: spacing.lg }]}>
        {deck === null ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>A carregar restaurantes…</Text>
        ) : deck.length === 0 ? (
          <EmptyState emoji="⏳" title="A aguardar os outros" message="Vê o resultado dentro de instantes." />
        ) : (
          deck
            .slice(0, 3)
            .reverse()
            .map((restaurant, idx, arr) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                isTop={idx === arr.length - 1}
                onSwiped={handleSwipe}
                liveResponders={idx === arr.length - 1 ? liveResponders : undefined}
                totalParticipants={participantCount}
              />
            ))
        )}
      </View>

      {deck && deck.length > 0 && (
        <View style={[styles.actions, { paddingBottom: spacing.xl }]}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.dislike }]}
            onPress={() => handleSwipe(false)}
          >
            <Text style={{ fontSize: 28 }}>✕</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.like }]}
            onPress={() => handleSwipe(true)}
          >
            <Text style={{ fontSize: 28 }}>♥</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  deckArea: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
