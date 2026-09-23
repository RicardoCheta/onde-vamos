import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { createExpense } from '../../lib/expenses';
import { listGroupMembers } from '../../lib/groups';
import { getSessionParticipants } from '../../lib/sessions';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import type { UserRow } from '../../types/database';
import type { Screen } from '../../navigation/types';

export default function CreateExpenseScreen({ route, navigation }: Screen<'CreateExpense'>) {
  const { groupId, sessionId, matchId, suggestedDescription } = route.params;
  const { colors, spacing } = useTheme();
  const currentUser = useAuthStore((s) => s.session?.user.id);

  const [candidates, setCandidates] = useState<UserRow[] | null>(null);
  const [description, setDescription] = useState(suggestedDescription ?? '');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(currentUser ?? null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loader = sessionId ? getSessionParticipants(sessionId) : listGroupMembers(groupId);
    loader.then((members) => {
      setCandidates(members);
      setSelected(new Set(members.map((m) => m.id)));
    });
  }, [groupId, sessionId]);

  function toggleParticipant(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!currentUser || !paidBy) return;
    const amount = Number(totalAmount.replace(',', '.'));

    if (!description.trim()) {
      setError('Dá uma descrição à despesa.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Introduz um valor total válido.');
      return;
    }
    if (selected.size === 0) {
      setError('Seleciona pelo menos uma pessoa para dividir a despesa.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createExpense({
        groupId,
        sessionId,
        matchId,
        description: description.trim(),
        totalAmount: amount,
        paidBy,
        participantIds: Array.from(selected),
        createdBy: currentUser,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar a despesa.');
    } finally {
      setLoading(false);
    }
  }

  const perPerson = (() => {
    const amount = Number(totalAmount.replace(',', '.'));
    if (!amount || selected.size === 0) return null;
    return (amount / selected.size).toFixed(2);
  })();

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TextField
          label="Descrição"
          placeholder="Ex: Jantar no Time Out"
          value={description}
          onChangeText={setDescription}
        />
        <TextField
          label="Valor total (€)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={totalAmount}
          onChangeText={setTotalAmount}
        />

        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.sm }}>Quem pagou?</Text>
        {candidates?.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => setPaidBy(m.id)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: spacing.sm }}
          >
            <RadioDot selected={paidBy === m.id} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 16 }}>
              {m.id === currentUser ? `${m.full_name} (tu)` : m.full_name}
            </Text>
          </Pressable>
        ))}

        <Text style={{ color: colors.text, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm }}>
          Dividir entre
        </Text>
        {candidates?.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => toggleParticipant(m.id)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: spacing.sm }}
          >
            <CheckboxDot selected={selected.has(m.id)} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 16 }}>
              {m.id === currentUser ? `${m.full_name} (tu)` : m.full_name}
            </Text>
          </Pressable>
        ))}

        {perPerson ? (
          <Text style={{ color: colors.textSecondary, marginTop: spacing.md }}>
            Cada pessoa paga aproximadamente {perPerson} €
          </Text>
        ) : null}

        {error ? <Text style={{ color: colors.dislike, marginTop: spacing.md }}>{error}</Text> : null}

        <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
          <Button label="Guardar despesa" onPress={handleSave} loading={loading} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function RadioDot({ selected, color }: { selected: boolean; color: string }) {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} /> : null}
    </View>
  );
}

function CheckboxDot({ selected, color }: { selected: boolean; color: string }) {
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: color,
        backgroundColor: selected ? color : 'transparent',
      }}
    />
  );
}
