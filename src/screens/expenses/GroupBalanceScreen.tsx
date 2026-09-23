import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { EmptyState } from '../../components/EmptyState';
import { ScreenContainer } from '../../components/ScreenContainer';
import { computeGroupBalances } from '../../lib/expenses';
import { listGroupMembers } from '../../lib/groups';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import type { Transfer } from '../../lib/debts';
import type { UserRow } from '../../types/database';
import type { Screen } from '../../navigation/types';

export default function GroupBalanceScreen({ route }: Screen<'GroupBalance'>) {
  const { groupId } = route.params;
  const { colors, spacing, radius } = useTheme();
  const currentUser = useAuthStore((s) => s.session?.user.id);

  const [members, setMembers] = useState<Record<string, UserRow>>({});
  const [transfers, setTransfers] = useState<Transfer[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [memberList, balances] = await Promise.all([
      listGroupMembers(groupId),
      computeGroupBalances(groupId),
    ]);
    const map: Record<string, UserRow> = {};
    memberList.forEach((m) => (map[m.id] = m));
    setMembers(map);
    setTransfers(balances.transfers);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (transfers === null) return null;

  const iOwe = transfers.filter((t) => t.fromUserId === currentUser);
  const owedToMe = transfers.filter((t) => t.toUserId === currentUser);

  if (iOwe.length === 0 && owedToMe.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState emoji="✅" title="Estás em dia!" message="Não tens nenhum saldo pendente neste grupo." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {owedToMe.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>
              Tens a receber
            </Text>
            {owedToMe.map((t, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={{ color: colors.text }}>{members[t.fromUserId]?.full_name ?? '—'}</Text>
                <Text style={{ color: colors.like, fontWeight: '700' }}>+{(t.amountCents / 100).toFixed(2)} €</Text>
              </View>
            ))}
          </View>
        )}

        {iOwe.length > 0 && (
          <View>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>
              Deves
            </Text>
            {iOwe.map((t, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                }}
              >
                <Text style={{ color: colors.text }}>{members[t.toUserId]?.full_name ?? '—'}</Text>
                <Text style={{ color: colors.dislike, fontWeight: '700' }}>-{(t.amountCents / 100).toFixed(2)} €</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
