import { useState } from 'react';
import { Text } from 'react-native';
import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { createGroup } from '../../lib/groups';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import type { Screen } from '../../navigation/types';

export default function CreateGroupScreen({ navigation }: Screen<'CreateGroup'>) {
  const { colors, spacing } = useTheme();
  const session = useAuthStore((s) => s.session);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!session) return;
    if (!name.trim()) {
      setError('Dá um nome ao grupo.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const group = await createGroup(name.trim(), session.user.id);
      navigation.replace('GroupDetail', { groupId: group.id, groupName: group.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar o grupo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 21 }}>
        Dá um nome ao grupo. Depois vais receber um código para partilhares com os teus amigos.
      </Text>
      <TextField
        label="Nome do grupo"
        placeholder="Ex: Jantaradas do Porto"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      {error ? <Text style={{ color: colors.dislike, marginBottom: spacing.md }}>{error}</Text> : null}
      <Button label="Criar grupo" onPress={handleCreate} loading={loading} />
    </ScreenContainer>
  );
}
