-- Onde Vamos — schema inicial
-- Corre este ficheiro no SQL Editor do Supabase (ou via `supabase db push` se usares a CLI).

create extension if not exists "pgcrypto";

-- ============================================================================
-- TABELAS
-- ============================================================================

-- Perfil público de cada utilizador autenticado (espelha auth.users)
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Grupo de amigos
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

-- Relação utilizador <-> grupo
create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Sessão "Onde Vamos" dentro de um grupo
create table public.swipe_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references public.users (id),
  city text not null,
  location_lat double precision not null,
  location_lng double precision not null,
  radius_meters integer not null default 1500,
  -- filters: { categories: string[], price_levels: number[] (0-4, escala Google), vegetarian_friendly: boolean }
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'matched', 'no_match', 'cancelled')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Participantes de uma sessão específica (subconjunto do grupo)
create table public.session_participants (
  session_id uuid not null references public.swipe_sessions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- Cache local dos restaurantes devolvidos pela Google Places API
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null unique,
  name text not null,
  address text,
  category text,
  price_level integer check (price_level between 0 and 4),
  rating numeric(2, 1),
  photo_url text,
  lat double precision,
  lng double precision,
  vegetarian_friendly boolean,
  raw jsonb,
  fetched_at timestamptz not null default now()
);

-- Baralho de restaurantes candidatos de uma sessão (permite saber quando um
-- participante esgotou os cartões, mesmo sem match)
create table public.session_restaurants (
  session_id uuid not null references public.swipe_sessions (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  position integer not null default 0,
  primary key (session_id, restaurant_id)
);

-- Cada swipe (like/dislike) de um utilizador a um restaurante, numa sessão
create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.swipe_sessions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  unique (session_id, user_id, restaurant_id)
);

-- Match: restaurante escolhido por unanimidade numa sessão
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.swipe_sessions (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id),
  matched_at timestamptz not null default now()
);

-- Despesa associada a um grupo (opcionalmente ligada a uma sessão/match)
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  session_id uuid references public.swipe_sessions (id) on delete set null,
  match_id uuid references public.matches (id) on delete set null,
  description text not null,
  total_amount numeric(10, 2) not null check (total_amount > 0),
  paid_by uuid not null references public.users (id),
  -- 'equal' é o único suportado no MVP; 'exact'/'percentage' ficam preparados para o futuro
  split_type text not null default 'equal' check (split_type in ('equal', 'exact', 'percentage')),
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

-- Quem participa em cada despesa e a fração/valor que lhe cabe
create table public.expense_participants (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  share_amount numeric(10, 2) not null check (share_amount >= 0),
  primary key (expense_id, user_id)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

create index idx_group_members_user on public.group_members (user_id);
create index idx_swipe_sessions_group on public.swipe_sessions (group_id);
create index idx_session_participants_user on public.session_participants (user_id);
create index idx_swipes_session_restaurant on public.swipes (session_id, restaurant_id);
create index idx_swipes_user on public.swipes (session_id, user_id);
create index idx_expenses_group on public.expenses (group_id);
create index idx_expense_participants_user on public.expense_participants (user_id);

-- ============================================================================
-- FUNÇÕES AUXILIARES (security definer, evitam recursão nas policies de RLS)
-- ============================================================================

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_session_participant(p_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.session_participants sp
    where sp.session_id = p_session_id and sp.user_id = auth.uid()
  );
$$;

create or replace function public.group_id_of_session(p_session_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select group_id from public.swipe_sessions where id = p_session_id;
$$;

-- ============================================================================
-- TRIGGERS DE AUTOMAÇÃO
-- ============================================================================

-- Cria a linha em public.users automaticamente quando alguém regista conta
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Torna automaticamente o criador de um grupo membro (owner) desse grupo
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- Deteta match: quando todos os participantes ativos de uma sessão dão "like"
-- ao mesmo restaurante, regista o match e termina a sessão.
create or replace function public.check_for_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_participant_count integer;
  v_liked_count integer;
begin
  select status into v_status from public.swipe_sessions where id = new.session_id;

  if v_status is distinct from 'active' then
    return new;
  end if;

  select count(*) into v_participant_count
  from public.session_participants
  where session_id = new.session_id;

  select count(*) into v_liked_count
  from public.swipes
  where session_id = new.session_id
    and restaurant_id = new.restaurant_id
    and liked = true;

  if v_participant_count > 0 and v_liked_count >= v_participant_count then
    insert into public.matches (session_id, restaurant_id)
    values (new.session_id, new.restaurant_id)
    on conflict (session_id) do nothing;

    update public.swipe_sessions
    set status = 'matched', ended_at = now()
    where id = new.session_id and status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_for_match on public.swipes;
create trigger trg_check_for_match
  after insert on public.swipes
  for each row
  when (new.liked = true)
  execute function public.check_for_match();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.swipe_sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.restaurants enable row level security;
alter table public.session_restaurants enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;

-- users: vejo-me a mim e a quem partilha algum grupo comigo
create policy "users_select" on public.users for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = public.users.id
    )
  );

create policy "users_insert_self" on public.users for insert
  with check (id = auth.uid());

create policy "users_update_self" on public.users for update
  using (id = auth.uid());

-- groups: só membros veem/gerem
create policy "groups_select_member" on public.groups for select
  using (public.is_group_member(id));

create policy "groups_insert_own" on public.groups for insert
  with check (created_by = auth.uid());

create policy "groups_update_owner" on public.groups for update
  using (created_by = auth.uid());

-- group_members
create policy "group_members_select" on public.group_members for select
  using (public.is_group_member(group_id));

create policy "group_members_insert" on public.group_members for insert
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

create policy "group_members_delete_self" on public.group_members for delete
  using (user_id = auth.uid());

-- swipe_sessions
create policy "sessions_select_group_member" on public.swipe_sessions for select
  using (public.is_group_member(group_id));

create policy "sessions_insert_group_member" on public.swipe_sessions for insert
  with check (public.is_group_member(group_id) and created_by = auth.uid());

create policy "sessions_update_group_member" on public.swipe_sessions for update
  using (public.is_group_member(group_id));

-- session_participants
create policy "session_participants_select" on public.session_participants for select
  using (public.is_group_member(public.group_id_of_session(session_id)));

create policy "session_participants_insert" on public.session_participants for insert
  with check (public.is_group_member(public.group_id_of_session(session_id)));

create policy "session_participants_delete_self" on public.session_participants for delete
  using (user_id = auth.uid());

-- restaurants: cache partilhada, qualquer utilizador autenticado lê/escreve
create policy "restaurants_select_authenticated" on public.restaurants for select
  using (auth.role() = 'authenticated');

create policy "restaurants_insert_authenticated" on public.restaurants for insert
  with check (auth.role() = 'authenticated');

create policy "restaurants_update_authenticated" on public.restaurants for update
  using (auth.role() = 'authenticated');

-- session_restaurants
create policy "session_restaurants_select" on public.session_restaurants for select
  using (public.is_group_member(public.group_id_of_session(session_id)));

create policy "session_restaurants_insert" on public.session_restaurants for insert
  with check (public.is_group_member(public.group_id_of_session(session_id)));

-- swipes: só participantes da sessão, cada um só regista o seu próprio swipe
create policy "swipes_select_participant" on public.swipes for select
  using (public.is_session_participant(session_id));

create policy "swipes_insert_own" on public.swipes for insert
  with check (user_id = auth.uid() and public.is_session_participant(session_id));

-- matches: visível a participantes da sessão (inserido apenas pelo trigger)
create policy "matches_select_participant" on public.matches for select
  using (public.is_session_participant(session_id));

-- expenses
create policy "expenses_select_group_member" on public.expenses for select
  using (public.is_group_member(group_id));

create policy "expenses_insert_group_member" on public.expenses for insert
  with check (public.is_group_member(group_id) and created_by = auth.uid());

create policy "expenses_update_creator" on public.expenses for update
  using (created_by = auth.uid());

create policy "expenses_delete_creator" on public.expenses for delete
  using (created_by = auth.uid());

-- expense_participants
create policy "expense_participants_select" on public.expense_participants for select
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

create policy "expense_participants_insert" on public.expense_participants for insert
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

-- ============================================================================
-- REALTIME
-- ============================================================================

alter publication supabase_realtime add table public.swipes;
alter publication supabase_realtime add table public.swipe_sessions;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.session_participants;
