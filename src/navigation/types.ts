import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  GroupsList: undefined;
  CreateGroup: undefined;
  JoinGroup: { inviteCode?: string } | undefined;
  GroupDetail: { groupId: string; groupName: string };
  CreateSession: { groupId: string; groupName: string };
  Swipe: { sessionId: string };
  MatchResult: { sessionId: string };
  NoMatch: { sessionId: string };
  CreateExpense: { groupId: string; sessionId?: string; matchId?: string; suggestedDescription?: string };
  GroupBalance: { groupId: string; groupName: string };
  ExpenseHistory: { groupId: string; groupName: string };
};

export type Screen<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
