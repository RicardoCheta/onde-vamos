import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { joinGroupByCode } from '../../lib/groups';
import { useAuthStore } from '../../store/authStore';
import { useInviteStore } from '../../store/inviteStore';
import { useTheme } from '../../theme/useTheme';
import type { Screen } from '../../navigation/types';

export default function JoinGroupScreen({ navigation, route }: Screen<'JoinGroup'>) {
  const { colors, spacing } = useTheme();
  const session = useAuthStore((s) => s.session);
  const setPendingCode = useInviteStore((s) => s.setPendingCode);

  const [code, setCode] = useState(route.params?.inviteCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!session) return;
    if (!code.trim()) {
      setError('Introduz o código de convite.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const group = await joinGroupByCode(code, session.user.id);
      navigation.replace('GroupDetail', { groupId: group.id, groupName: group.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar no grupo.');
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <ScreenContainer>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm }}>
          Precisas de uma conta para entrares neste grupo
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 21 }}>
          {code
            ? `Assim que entrares, junta-te automaticamente com o código ${code.toUpperCase()}.`
            : 'Cria conta ou inicia sessão para poderes entrar num grupo.'}
        </Text>
        <Button
          label="Iniciar sessão"
          onPress={() => {
            setPendingCode(code || null);
            navigation.navigate('Login');
          }}
        />
        <View style={{ marginTop: spacing.md }}>
          <Button
            label="Criar conta"
            variant="ghost"
            onPress={() => {
              setPendingCode(code || null);
              navigation.navigate('SignUp');
            }}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 21 }}>
        Pede o código de convite a quem criou o grupo e insere-o abaixo.
      </Text>
      <TextField
        label="Código de convite"
        placeholder="Ex: F3K9QZ"
        autoCapitalize="characters"
        value={code}
        onChangeText={setCode}
        autoFocus
      />
      {error ? <Text style={{ color: colors.dislike, marginBottom: spacing.md }}>{error}</Text> : null}
      <Button label="Entrar no grupo" onPress={handleJoin} loading={loading} />
    </ScreenContainer>
  );
}
