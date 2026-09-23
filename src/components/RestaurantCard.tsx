import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import type { RestaurantRow } from '../types/database';

const SWIPE_THRESHOLD = 120;

interface RestaurantCardProps {
  restaurant: RestaurantRow;
  onSwiped: (liked: boolean) => void;
  isTop: boolean;
  liveResponders?: number;
  totalParticipants?: number;
}

const PRICE_LABEL: Record<number, string> = { 0: 'Grátis', 1: '€', 2: '€€', 3: '€€€', 4: '€€€€' };

export function RestaurantCard({ restaurant, onSwiped, isTop, liveResponders, totalParticipants }: RestaurantCardProps) {
  const { colors, spacing, radius } = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  function complete(liked: boolean) {
    onSwiped(liked);
  }

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const shouldSwipe = Math.abs(event.translationX) > SWIPE_THRESHOLD;
      if (shouldSwipe) {
        const liked = event.translationX > 0;
        translateX.value = withTiming(liked ? 600 : -600, { duration: 250 }, () => {
          runOnJS(complete)(liked);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-300, 300], [-15, 15]);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, 120], [0, 1]),
  }));
  const nopeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-120, -20], [1, 0]),
  }));

  const card = (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderRadius: radius.xl },
        isTop && cardStyle,
      ]}
    >
      {restaurant.photo_url ? (
        <Image source={{ uri: restaurant.photo_url }} style={styles.photo} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={{ fontSize: 56 }}>🍽️</Text>
        </View>
      )}

      {isTop && (
        <>
          <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle, { borderColor: colors.like }]}>
            <Text style={[styles.stampText, { color: colors.like }]}>GOSTO</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStampStyle, { borderColor: colors.dislike }]}>
            <Text style={[styles.stampText, { color: colors.dislike }]}>PASSO</Text>
          </Animated.View>
        </>
      )}

      <View style={[styles.info, { padding: spacing.lg }]}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.metaRow}>
          {restaurant.rating ? <Text style={[styles.meta, { color: colors.text }]}>⭐ {restaurant.rating}</Text> : null}
          {restaurant.price_level !== null ? (
            <Text style={[styles.meta, { color: colors.text }]}>{PRICE_LABEL[restaurant.price_level]}</Text>
          ) : null}
          {restaurant.category ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {restaurant.category}
            </Text>
          ) : null}
        </View>
        {restaurant.address ? (
          <Text style={{ color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
            📍 {restaurant.address}
          </Text>
        ) : null}
        {isTop && totalParticipants && totalParticipants > 1 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 12 }}>
            {liveResponders ?? 0}/{totalParticipants} amigos já decidiram sobre este restaurante
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );

  if (!isTop) return card;

  return <GestureDetector gesture={pan}>{card}</GestureDetector>;
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  photo: {
    width: '100%',
    height: '68%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    alignItems: 'center',
  },
  meta: {
    fontSize: 14,
    fontWeight: '600',
  },
  stamp: {
    position: 'absolute',
    top: 40,
    borderWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  likeStamp: {
    left: 20,
    transform: [{ rotate: '-15deg' }],
  },
  nopeStamp: {
    right: 20,
    transform: [{ rotate: '15deg' }],
  },
  stampText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
