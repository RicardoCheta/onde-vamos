import { useState } from 'react';
import { Alert, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { getSession, widenSessionSearch } from '../../lib/sessions';
import { useTheme } from '../../theme/useTheme';
import type { Screen } from '../../navigation/types';

export default function NoMatchScreen({ route, navigation }: Screen<'NoMatch'>) {
  const { sessionId } = route.params;
  const { spacing } = useTheme();
  const [loading, setLoading] = useState(false);

  async function handleWiden() {
    setLoading(true);
    try {
      const session = await getSession(sessionId);
      const added = await widenSessionSearch(session, 1500);
      if (added === 0) {
        Alert.alert(
          'Sem novidades',
          'Não encontrámos mais restaurantes, mesmo com um raio maior. Tenta mudar os filtros na próxima sessão.'
        );
        return;
      }
      navigation.replace('Swipe', { sessionId });
    } catch (e) {
      Alert.alert('Ocorreu um erro', e instanceof Error ? e.message : 'Tenta novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <EmptyState
        emoji="🤔"
        title="Ainda sem match"
        message="Vocês esgotaram os restaurantes disponíveis sem chegarem a um acordo. Que tal alargar o raio de procura e tentar outra vez?"
      />
      <Button label="Alargar raio e tentar de novo" onPress={handleWiden} loading={loading} />
      <View style={{ height: spacing.sm }} />
      <Button label="Voltar ao grupo" variant="ghost" onPress={() => navigation.goBack()} />
    </ScreenContainer>
  );
}
