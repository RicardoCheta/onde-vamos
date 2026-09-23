import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/useTheme';

import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import GroupsListScreen from '../screens/groups/GroupsListScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import JoinGroupScreen from '../screens/groups/JoinGroupScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import CreateSessionScreen from '../screens/sessions/CreateSessionScreen';
import SwipeScreen from '../screens/sessions/SwipeScreen';
import MatchResultScreen from '../screens/sessions/MatchResultScreen';
import NoMatchScreen from '../screens/sessions/NoMatchScreen';
import CreateExpenseScreen from '../screens/expenses/CreateExpenseScreen';
import GroupBalanceScreen from '../screens/expenses/GroupBalanceScreen';
import ExpenseHistoryScreen from '../screens/expenses/ExpenseHistoryScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'ondevamos://', 'https://ondevamos.app'],
  config: {
    screens: {
      JoinGroup: 'join/:inviteCode',
    },
  },
};

export default function RootNavigator() {
  const { colors } = useTheme();
  const { session, initializing, init } = useAuthStore();

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const screenOptions = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '700' as const },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={screenOptions}>
        {!session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Criar conta' }} />
            <Stack.Screen
              name="JoinGroup"
              component={JoinGroupScreen}
              options={{ title: 'Entrar num grupo' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="GroupsList" component={GroupsListScreen} options={{ title: 'Onde Vamos' }} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Novo grupo' }} />
            <Stack.Screen name="JoinGroup" component={JoinGroupScreen} options={{ title: 'Entrar num grupo' }} />
            <Stack.Screen
              name="GroupDetail"
              component={GroupDetailScreen}
              options={({ route }) => ({ title: route.params.groupName })}
            />
            <Stack.Screen
              name="CreateSession"
              component={CreateSessionScreen}
              options={{ title: 'Onde Vamos?' }}
            />
            <Stack.Screen name="Swipe" component={SwipeScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="MatchResult"
              component={MatchResultScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="NoMatch"
              component={NoMatchScreen}
              options={{ title: 'Sem match', gestureEnabled: false }}
            />
            <Stack.Screen
              name="CreateExpense"
              component={CreateExpenseScreen}
              options={{ title: 'Nova despesa', presentation: 'modal' }}
            />
            <Stack.Screen
              name="GroupBalance"
              component={GroupBalanceScreen}
              options={{ title: 'Saldos do grupo' }}
            />
            <Stack.Screen
              name="ExpenseHistory"
              component={ExpenseHistoryScreen}
              options={{ title: 'Despesas' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
