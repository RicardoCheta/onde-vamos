import { useCallback, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { EmptyState } from '../../components/EmptyState';
import { ScreenContainer } from '../../components/ScreenContainer';
import { getGroup } from '../../lib/groups';
import { listGroupSessions } from '../../lib/sessions';
import { useTheme } from '../../theme/useTheme';
import type { GroupRow, SwipeSessionRow } from '../../types/database';
import type { Screen } from '../../navigation/types';

const STATUS_LABEL: Record<SwipeSessionRow['status'], string> = {
  active: 'Em curso',
  matched: 'Match! 🎉',
  no_match: 'Sem match',
  cancelled: 'Cancelada',
};

export default function GroupDetailScreen({ route, navigation }: Screen<'GroupDetail'>) {
  const { groupId, groupName } = route.params;
  const { colors, spacing, radius } = useTheme();

  const [group, setGroup] = useState<GroupRow | null>(null);
  const [sessions, setSessions] = useState<SwipeSessionRow[]>([]);

  const load = useCallback(async () => {
    try {
      const [groupData, sessionsData] = await Promise.all([getGroup(groupId), listGroupSessions(groupId)]);
      setGroup(groupData);
      setSessions(sessionsData);
    } catch (e) {
      console.warn('Erro ao carregar grupo:', e);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleInvite() {
    if (!group) return;
    const link = Linking.createURL(`join/${group.invite_code}`);
    try {
      await Share.share({
        message: `Junta-te ao grupo "${group.name}" no Onde Vamos! Código: ${group.invite_code}\n${link}`,
      });
    } catch (e) {
      console.warn('Não foi possível abrir o menu de partilha:', e);
    }
  }

  function goToSession(session: SwipeSessionRow) {
    if (session.status === 'matched') {
      navigation.navigate('MatchResult', { sessionId: session.id });
    } else if (session.status === 'active') {
      navigation.navigate('Swipe', { sessionId: session.id });
    } else {
      navigation.navigate('NoMatch', { sessionId: session.id });
    }
  }

  return (
    <ScreenContainer padded={false}>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Pressable
          style={[styles.primaryAction, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
          onPress={() => navigation.navigate('CreateSession', { groupId, groupName })}
        >
          <Text style={styles.primaryActionEmoji}>🍽️</Text>
          <Text style={[styles.primaryActionLabel, { color: colors.onPrimary }]}>Onde Vamos?</Text>
          <Text style={[styles.primaryActionSub, { color: colors.onPrimary }]}>Iniciar nova sessão de swipe</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable
            style={[styles.secondaryAction, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
            onPress={() => navigation.navigate('GroupBalance', { groupId, groupName })}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>💶 Saldos</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryAction, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
            onPress={() => navigation.navigate('ExpenseHistory', { groupId, groupName })}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>🧾 Despesas</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryAction, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
            onPress={handleInvite}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>📤 Convidar</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: spacing.lg }]}>
        Sessões anteriores
      </Text>

      {sessions.length === 0 ? (
        <EmptyState
          emoji="🕒"
          title="Ainda sem sessões"
          message="Quando iniciares uma sessão 'Onde Vamos', o histórico aparece aqui."
        />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
              onPress={() => goToSession(item)}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>{item.city}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{STATUS_LABEL[item.status]}</Text>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  primaryAction: {
    padding: 20,
    alignItems: 'center',
  },
  primaryActionEmoji: { fontSize: 32, marginBottom: 4 },
  primaryActionLabel: { fontSize: 20, fontWeight: '800' },
  primaryActionSub: { fontSize: 13, marginTop: 2, opacity: 0.9 },
  secondaryAction: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  sessionCard: {
    padding: 14,
    borderWidth: 1,
  },
});
