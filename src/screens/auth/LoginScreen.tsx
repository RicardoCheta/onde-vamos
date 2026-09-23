import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import type { Screen } from '../../navigation/types';

export default function LoginScreen({ navigation }: Screen<'Login'>) {
  const { colors, spacing } = useTheme();
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Preenche o email e a palavra-passe.');
      return;
    }
    setLoading(true);
    const message = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (message) setError(traduzErro(message));
  }

  return (
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>🍽️</Text>
        <Text style={[styles(colors).title]}>Onde Vamos</Text>
        <Text style={[styles(colors).subtitle, { marginBottom: spacing.xl }]}>
          Decide com os teus amigos onde jantar, sem eterna indecisão.
        </Text>

        <TextField
          label="Email"
          placeholder="tu@exemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label="Palavra-passe"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={{ color: colors.dislike, marginBottom: spacing.md }}>{error}</Text> : null}

        <Button label="Entrar" onPress={handleLogin} loading={loading} />

        <View style={{ marginTop: spacing.md }}>
          <Button label="Criar conta nova" variant="ghost" onPress={() => navigation.navigate('SignUp')} />
        </View>
      </View>
    </ScreenContainer>
  );
}

function traduzErro(message: string) {
  if (message.includes('Invalid login credentials')) return 'Email ou palavra-passe incorretos.';
  if (message.includes('Email not confirmed')) return 'Confirma o teu email antes de entrares.';
  return message;
}

const styles = (colors: ReturnType<typeof useTheme>['colors']) => ({
  title: { fontSize: 30, fontWeight: '800' as const, color: colors.text },
  subtitle: { fontSize: 15, color: colors.textSecondary, lineHeight: 21 },
});
