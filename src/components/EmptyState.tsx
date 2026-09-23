import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Button } from './Button';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji = '🍽️', title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: colors.text, marginTop: spacing.md }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary, marginTop: spacing.sm }]}>{message}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
});
