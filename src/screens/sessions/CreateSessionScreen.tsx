import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { FOOD_CATEGORIES, PORTUGAL_CITIES, PRICE_LEVELS } from '../../constants/categories';
import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listGroupMembers } from '../../lib/groups';
import { createSession } from '../../lib/sessions';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import type { UserRow } from '../../types/database';
import type { Screen } from '../../navigation/types';

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function CreateSessionScreen({ route, navigation }: Screen<'CreateSession'>) {
  const { groupId } = route.params;
  const { colors, spacing, radius: br } = useTheme();
  const session = useAuthStore((s) => s.session);

  const [city, setCity] = useState<(typeof PORTUGAL_CITIES)[number]>(PORTUGAL_CITIES[0]);
  const [radiusKm, setRadiusKm] = useState(1.5);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedPrices, setSelectedPrices] = useState<Set<number>>(new Set());

  const [members, setMembers] = useState<UserRow[] | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listGroupMembers(groupId).then((data) => {
      setMembers(data);
      setSelectedMembers(new Set(data.map((m) => m.id)));
    });
  }, [groupId]);

  async function handleStart() {
    if (!session) return;
    if (selectedMembers.size === 0) {
      Alert.alert('Seleciona participantes', 'Escolhe pelo menos uma pessoa para esta sessão.');
      return;
    }

    setLoading(true);
    try {
      const categoryKeywords = FOOD_CATEGORIES.filter((c) => selectedCategories.has(c.id)).map(
        (c) => c.keyword
      );

      const created = await createSession({
        groupId,
        createdBy: session.user.id,
        city: city.label,
        lat: city.lat,
        lng: city.lng,
        radiusMeters: Math.round(radiusKm * 1000),
        filters: {
          categories: categoryKeywords,
          price_levels: Array.from(selectedPrices),
        },
        participantIds: Array.from(selectedMembers),
      });

      navigation.replace('Swipe', { sessionId: created.id });
    } catch (e) {
      Alert.alert('Não foi possível iniciar', e instanceof Error ? e.message : 'Tenta novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Section title="Cidade" colors={colors} spacing={spacing}>
          <ChipRow spacing={spacing}>
            {PORTUGAL_CITIES.map((c) => (
              <Chip
                key={c.label}
                label={c.label}
                selected={city.label === c.label}
                onPress={() => setCity(c)}
                colors={colors}
                radius={br}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title={`Raio de procura: ${radiusKm.toFixed(1)} km`} colors={colors} spacing={spacing}>
          <ChipRow spacing={spacing}>
            {[1, 1.5, 2, 3, 5].map((km) => (
              <Chip
                key={km}
                label={`${km} km`}
                selected={radiusKm === km}
                onPress={() => setRadiusKm(km)}
                colors={colors}
                radius={br}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Categoria (opcional)" colors={colors} spacing={spacing}>
          <ChipRow spacing={spacing} wrap>
            {FOOD_CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.label}
                selected={selectedCategories.has(cat.id)}
                onPress={() => setSelectedCategories((prev) => toggle(prev, cat.id))}
                colors={colors}
                radius={br}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Preço (opcional)" colors={colors} spacing={spacing}>
          <ChipRow spacing={spacing}>
            {PRICE_LEVELS.map((p) => (
              <Chip
                key={p.level}
                label={p.label}
                selected={selectedPrices.has(p.level)}
                onPress={() => setSelectedPrices((prev) => toggle(prev, p.level))}
                colors={colors}
                radius={br}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Quem vai participar?" colors={colors} spacing={spacing}>
          {members === null ? (
            <Text style={{ color: colors.textSecondary }}>A carregar membros…</Text>
          ) : (
            members.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => setSelectedMembers((prev) => toggle(prev, m.id))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  gap: spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    backgroundColor: selectedMembers.has(m.id) ? colors.primary : 'transparent',
                  }}
                />
                <Text style={{ color: colors.text, fontSize: 16 }}>{m.full_name}</Text>
              </Pressable>
            ))
          )}
        </Section>

        <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
          <Button label="Começar a fazer swipe" onPress={handleStart} loading={loading} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({
  title,
  children,
  colors,
  spacing,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
}) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: spacing.sm }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function ChipRow({
  children,
  spacing,
  wrap,
}: {
  children: React.ReactNode;
  spacing: ReturnType<typeof useTheme>['spacing'];
  wrap?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: spacing.sm }}>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  colors,
  radius,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  radius: ReturnType<typeof useTheme>['radius'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: radius.full,
        backgroundColor: selected ? colors.primary : colors.surfaceAlt,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
