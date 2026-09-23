import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { EmptyState } from '../../components/EmptyState';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listGroupExpenses } from '../../lib/expenses';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import type { ExpenseWithParticipants } from '../../types/database';
import type { Screen } from '../../navigation/types';

export default function ExpenseHistoryScreen({ route, navigation }: Screen<'ExpenseHistory'>) {
  const { groupId } = route.params;
  const { colors, spacing, radius } = useTheme();
  const currentUser = useAuthStore((s) => s.session?.user.id);

  const [expenses, setExpenses] = useState<ExpenseWithParticipants[] | null>(null);

  const load = useCallback(async () => {
    const data = await listGroupExpenses(groupId);
    setExpenses(data);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScreenContainer padded={false}>
      <View style={{ padding: spacing.lg }}>
        <Pressable
          style={{ backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, alignItems: 'center' }}
          onPress={() => navigation.navigate('CreateExpense', { groupId })}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>+ Nova despesa</Text>
        </Pressable>
      </View>

      {expenses === null ? null : expenses.length === 0 ? (
        <EmptyState
          emoji="🧾"
          title="Ainda sem despesas"
          message="Depois de um jantar, regista aqui quanto custou e quem participou."
        />
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.sm }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700', flexShrink: 1 }}>{item.description}</Text>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{Number(item.total_amount).toFixed(2)} €</Text>
              </View>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                Pago por {item.payer?.id === currentUser ? 'ti' : item.payer?.full_name} ·{' '}
                {new Date(item.created_at).toLocaleDateString('pt-PT')}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 2, fontSize: 13 }}>
                Dividido por {item.participants.length}{' '}
                {item.participants.length === 1 ? 'pessoa' : 'pessoas'}
              </Text>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}
