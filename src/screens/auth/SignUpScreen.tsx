import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TextField } from '../../components/TextField';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/useTheme';
import type { Screen } from '../../navigation/types';

export default function SignUpScreen({ navigation }: Screen<'SignUp'>) {
  const { colors, spacing } = useTheme();
  const signUp = useAuthStore((s) => s.signUp);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);
    setInfo(null);
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Preenche o nome, email e uma palavra-passe com pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const message = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);
    if (message) {
      setError(message);
      return;
    }
    setInfo('Conta criada! Se o teu projeto Supabase pedir confirmação de email, verifica a tua caixa de entrada.');
  }

  return (
    <ScreenContainer>
      <TextField label="Nome" placeholder="O teu nome" value={fullName} onChangeText={setFullName} />
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
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={{ color: colors.dislike, marginBottom: spacing.md }}>{error}</Text> : null}
      {info ? <Text style={{ color: colors.like, marginBottom: spacing.md }}>{info}</Text> : null}

      <Button label="Criar conta" onPress={handleSignUp} loading={loading} />

      <View style={{ marginTop: spacing.md }}>
        <Button label="Já tenho conta" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </ScreenContainer>
  );
}
