import { supabase } from './supabase';
import type { GroupRow, GroupWithMemberCount, UserRow } from '../types/database';

// Sem O/0/I/1 para evitar confusão ao ditar o código por WhatsApp/voz
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function createGroup(name: string, userId: string): Promise<GroupRow> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const invite_code = generateInviteCode();
    const { data, error } = await supabase
      .from('groups')
      .insert({ name, invite_code, created_by: userId })
      .select('*')
      .single();

    if (!error) return data;
    // 23505 = unique_violation no Postgres — tenta outro código
    if ((error as { code?: string }).code !== '23505') throw error;
  }
  throw new Error('Não foi possível gerar um código de convite único. Tenta novamente.');
}

export async function joinGroupByCode(code: string, userId: string): Promise<GroupRow> {
  const normalized = code.trim().toUpperCase();
  const { data: group, error: findError } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', normalized)
    .single();

  if (findError || !group) {
    throw new Error('Não encontrámos nenhum grupo com esse código.');
  }

  const { error: joinError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId });

  if (joinError && (joinError as { code?: string }).code !== '23505') {
    throw joinError;
  }

  return group;
}

export async function listMyGroups(): Promise<GroupWithMemberCount[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(*, group_members(count))')
    .order('joined_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row.groups,
    member_count: row.groups?.group_members?.[0]?.count ?? 1,
  }));
}

export async function getGroup(groupId: string): Promise<GroupRow> {
  const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).single();
  if (error) throw error;
  return data;
}

export async function listGroupMembers(groupId: string): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('users(*)')
    .eq('group_id', groupId);

  if (error) throw error;
  return (data ?? []).map((row: any) => row.users);
}
