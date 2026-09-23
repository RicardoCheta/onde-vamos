import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { EmptyState } from '../../components/EmptyState';
import { ScreenContainer } from '../../components/ScreenContainer';
import { joinGroupByCode, listMyGroups } from '../../lib/groups';
import { useAuthStore } from '../../store/authStore';
import { useInviteStore } from '../../store/inviteStore';
import { useTheme } from '../../theme/useTheme';
import type { GroupWithMemberCount } from '../../types/database';
import type { Screen } from '../../navigation/types';

export default function GroupsListScreen({ navigation }: Screen<'GroupsList'>) {
  const { colors, spacing, radius } = useTheme();
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const pendingCode = useInviteStore((s) => s.pendingCode);
  const setPendingCode = useInviteStore((s) => s.setPendingCode);

  const [groups, setGroups] = useState<GroupWithMemberCount[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listMyGroups();
      setGroups(data);
    } catch (e) {
      console.warn('Erro ao carregar grupos:', e);
      setGroups([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      if (!pendingCode || !session) return;
      const code = pendingCode;
      setPendingCode(null);
      joinGroupByCode(code, session.user.id)
        .then((group) => {
          navigation.navigate('GroupDetail', { groupId: group.id, groupName: group.name });
          load();
        })
        .catch((e) => console.warn('Não foi possível entrar automaticamente no grupo:', e));
    }, [pendingCode, session, setPendingCode, navigation, load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScreenContainer padded={false}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.sm }]}>
        <Text style={{ color: colors.textSecondary }}>
          Olá, {profile?.full_name?.split(' ')[0] ?? 'amigo'} 👋
        </Text>
        <Pressable onPress={signOut}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Sair</Text>
        </Pressable>
      </View>

      <View style={[styles.actions, { paddingHorizontal: spacing.lg, gap: spacing.sm }]}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Text style={[styles.actionLabel, { color: colors.onPrimary }]}>+ Novo grupo</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
          onPress={() => navigation.navigate('JoinGroup')}
        >
          <Text style={[styles.actionLabel, { color: colors.text }]}>Entrar com código</Text>
        </Pressable>
      </View>

      {groups === null ? null : groups.length === 0 ? (
        <EmptyState
          emoji="👯"
          title="Ainda sem grupos"
          message="Cria um grupo para os teus amigos, ou entra num grupo existente com um código de convite."
          actionLabel="Criar o meu primeiro grupo"
          onAction={() => navigation.navigate('CreateGroup')}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, borderColor: colors.border }]}
              onPress={() => navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name })}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                {item.member_count} {item.member_count === 1 ? 'membro' : 'membros'} · código {item.invite_code}
              </Text>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionLabel: {
    fontWeight: '700',
  },
  card: {
    padding: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
});
