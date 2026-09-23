import { equalShares, simplifyDebts, type Transfer } from './debts';
import { supabase } from './supabase';
import type { ExpenseWithParticipants } from '../types/database';

export interface CreateExpenseParams {
  groupId: string;
  sessionId?: string;
  matchId?: string;
  description: string;
  totalAmount: number;
  paidBy: string;
  participantIds: string[];
  createdBy: string;
}

export async function createExpense(params: CreateExpenseParams) {
  const totalCents = Math.round(params.totalAmount * 100);
  const shares = equalShares(totalCents, params.participantIds.length);

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      group_id: params.groupId,
      session_id: params.sessionId ?? null,
      match_id: params.matchId ?? null,
      description: params.description,
      total_amount: params.totalAmount,
      paid_by: params.paidBy,
      split_type: 'equal',
      created_by: params.createdBy,
    })
    .select('*')
    .single();

  if (error) throw error;

  const participantRows = params.participantIds.map((userId, i) => ({
    expense_id: expense.id,
    user_id: userId,
    share_amount: shares[i] / 100,
  }));

  const { error: participantsError } = await supabase.from('expense_participants').insert(participantRows);
  if (participantsError) throw participantsError;

  return expense;
}

export async function listGroupExpenses(groupId: string): Promise<ExpenseWithParticipants[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, payer:users!expenses_paid_by_fkey(*), participants:expense_participants(*, user:users(*))')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ExpenseWithParticipants[];
}

export interface GroupBalances {
  transfers: Transfer[];
  netByUser: Record<string, number>; // em euros, positivo = tem a receber
}

export async function computeGroupBalances(groupId: string): Promise<GroupBalances> {
  const { data, error } = await supabase
    .from('expenses')
    .select('paid_by, total_amount, expense_participants(user_id, share_amount)')
    .eq('group_id', groupId);

  if (error) throw error;

  const netCents: Record<string, number> = {};

  for (const expense of data ?? []) {
    const totalCents = Math.round(Number(expense.total_amount) * 100);
    netCents[expense.paid_by] = (netCents[expense.paid_by] ?? 0) + totalCents;

    for (const participant of (expense as any).expense_participants ?? []) {
      const shareCents = Math.round(Number(participant.share_amount) * 100);
      netCents[participant.user_id] = (netCents[participant.user_id] ?? 0) - shareCents;
    }
  }

  const transfers = simplifyDebts(netCents);
  const netByUser: Record<string, number> = {};
  for (const [userId, cents] of Object.entries(netCents)) {
    netByUser[userId] = cents / 100;
  }

  return { transfers, netByUser };
}
