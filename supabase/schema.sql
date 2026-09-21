-- ==============================================================================
-- PairPay (ペアペイ) Supabase 初期セットアップ SQL (再実行可能・エラー安全版)
-- Supabaseダッシュボードの「SQL Editor」に貼り付けて「RUN」を押すだけで完了します。
-- ==============================================================================

-- 1. 世帯テーブル (夫婦で1レコードを共有)
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Home', -- 世帯名（任意）
  join_code text unique not null default upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6)), -- 6桁の招待コード
  user1_name text not null default '夫',
  user2_name text not null default '妻',
  ratio_user1 integer not null default 50, -- 夫の負担割合 (%)
  ratio_user2 integer not null default 50, -- 妻の負担割合 (%)
  created_at timestamp with time zone default now()
);

-- 2. プロファイルテーブル (Supabase Authと連携)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  display_name text not null default 'パートナー',
  created_at timestamp with time zone default now()
);

-- 3. 支出レコードテーブル
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text, -- メモ（任意）
  amount integer not null check (amount > 0),
  category text not null check (category in ('food', 'daily', 'utility', 'dining', 'special', 'other')),
  paid_by_name text not null, -- '夫' または '妻'
  expense_date date not null default current_date,
  is_settled boolean not null default false, -- 精算済みフラグ
  created_at timestamp with time zone default now()
);

-- インデックス作成
create index if not exists idx_expenses_household_date on public.expenses(household_id, expense_date);
create index if not exists idx_expenses_settled on public.expenses(household_id, is_settled);
create index if not exists idx_households_code on public.households(join_code);

-- ==============================================================================
-- 行レベルセキュリティ (RLS) 有効化 & ポリシー設定 (上書き対応)
-- ==============================================================================
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.expenses enable row level security;

-- profiles ポリシー
drop policy if exists "Allow all actions on profiles for authenticated users" on public.profiles;
create policy "Allow all actions on profiles for authenticated users"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

-- households ポリシー (所属メンバー、または新規作成時の authenticated ユーザー)
drop policy if exists "Allow select households for member or with join_code" on public.households;
drop policy if exists "Allow select households for members" on public.households;
create policy "Allow select households for members"
on public.households for select
using (
  id in (select household_id from public.profiles where id = auth.uid())
  or auth.role() = 'authenticated'
);

drop policy if exists "Allow insert households for authenticated users" on public.households;
create policy "Allow insert households for authenticated users"
on public.households for insert
with check (auth.role() = 'authenticated');

drop policy if exists "Allow update households for members" on public.households;
create policy "Allow update households for members"
on public.households for update
using (
  id in (select household_id from public.profiles where id = auth.uid())
);

-- ==============================================================================
-- 安全な世帯作成 & プロファイル紐付け RPC 関数 (Security Definer)
-- ==============================================================================
create or replace function public.create_household_and_link_profile(
  p_name text default '我が家',
  p_user1_name text default '夫',
  p_user2_name text default '妻'
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household public.households;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception '認証が必要です';
  end if;

  insert into public.households (name, user1_name, user2_name, ratio_user1, ratio_user2)
  values (coalesce(nullif(trim(p_name), ''), '我が家'), coalesce(nullif(trim(p_user1_name), ''), '夫'), coalesce(nullif(trim(p_user2_name), ''), '妻'), 50, 50)
  returning * into v_household;

  insert into public.profiles (id, household_id, display_name)
  values (v_user_id, v_household.id, p_user1_name)
  on conflict (id) do update
  set household_id = v_household.id,
      display_name = p_user1_name;

  return v_household;
end;
$$;

-- ==============================================================================
-- 安全な世帯参加 RPC 関数 (Security Definer: 全件ダンプを防ぎ招待コード一致分のみ操作)
-- ==============================================================================

create or replace function public.join_household_by_code(
  p_code text,
  p_display_name text default '妻'
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household public.households;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception '認証が必要です';
  end if;

  if p_code is null or trim(p_code) = '' then
    return null;
  end if;

  -- 招待コードに一致する世帯を1件のみ安全に取得
  select * into v_household
  from public.households
  where upper(join_code) = upper(trim(p_code))
  limit 1;

  if v_household.id is null then
    return null;
  end if;

  -- プロファイルをこの世帯に紐付け
  insert into public.profiles (id, household_id, display_name)
  values (v_user_id, v_household.id, p_display_name)
  on conflict (id) do update
  set household_id = v_household.id,
      display_name = p_display_name;

  return v_household;
end;
$$;


-- expenses ポリシー
drop policy if exists "Users can view expenses in same household" on public.expenses;
create policy "Users can view expenses in same household"
on public.expenses for select
using (
  household_id in (select household_id from public.profiles where id = auth.uid())
);

drop policy if exists "Users can insert expenses in same household" on public.expenses;
create policy "Users can insert expenses in same household"
on public.expenses for insert
with check (
  household_id in (select household_id from public.profiles where id = auth.uid())
);

drop policy if exists "Users can update expenses in same household" on public.expenses;
create policy "Users can update expenses in same household"
on public.expenses for update
using (
  household_id in (select household_id from public.profiles where id = auth.uid())
);

drop policy if exists "Users can delete expenses in same household" on public.expenses;
create policy "Users can delete expenses in same household"
on public.expenses for delete
using (
  household_id in (select household_id from public.profiles where id = auth.uid())
);

-- ==============================================================================
-- リアルタイム同期 (Supabase Realtime) の安全な有効化
-- ==============================================================================
do $$
begin
  alter publication supabase_realtime add table public.expenses;
exception when others then
  null; -- すでに登録済みの場合は無視
end $$;

do $$
begin
  alter publication supabase_realtime add table public.households;
exception when others then
  null; -- すでに登録済みの場合は無視
end $$;

-- ==============================================================================
-- 4. 支出個別負担 (split_type) カラムの追加
-- ==============================================================================
alter table public.expenses
add column if not exists split_type text not null default 'ratio';

-- ==============================================================================
-- 5. 精算完了ログテーブル (settlement_logs)
-- ==============================================================================
create table if not exists public.settlement_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  year_month text not null, -- 'YYYY-MM'
  settled_at timestamp with time zone not null default now(),
  sender_name text not null,
  receiver_name text not null,
  amount integer not null check (amount >= 0),
  total_amount integer not null default 0,
  expense_count integer not null default 0,
  created_at timestamp with time zone default now()
);

create index if not exists idx_settlement_logs_household on public.settlement_logs(household_id, settled_at desc);

alter table public.settlement_logs enable row level security;

drop policy if exists "Users can view settlement logs in same household" on public.settlement_logs;
create policy "Users can view settlement logs in same household"
on public.settlement_logs for select
using (
  household_id in (select household_id from public.profiles where id = auth.uid())
);

drop policy if exists "Users can insert settlement logs in same household" on public.settlement_logs;
create policy "Users can insert settlement logs in same household"
on public.settlement_logs for insert
with check (
  household_id in (select household_id from public.profiles where id = auth.uid())
);

drop policy if exists "Users can delete settlement logs in same household" on public.settlement_logs;
create policy "Users can delete settlement logs in same household"
on public.settlement_logs for delete
using (
  household_id in (select household_id from public.profiles where id = auth.uid())
);

-- ==============================================================================
-- 6. 固定費・定期支出テンプレートテーブル (recurring_templates)
-- ==============================================================================
create table if not exists public.recurring_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  amount integer not null check (amount > 0),
  category text not null check (category in ('food', 'daily', 'utility', 'dining', 'special', 'other')),
  paid_by_name text not null,
  split_type text not null default 'ratio',
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  created_at timestamp with time zone default now()
);

create index if not exists idx_recurring_templates_household on public.recurring_templates(household_id);

alter table public.recurring_templates enable row level security;

drop policy if exists "Users can view recurring templates in same household" on public.recurring_templates;
create policy "Users can view recurring templates in same household"
on public.recurring_templates for select
using (
  household_id in (select household_id from public.profiles where id = auth.uid())
);

drop policy if exists "Users can manage recurring templates in same household" on public.recurring_templates;
create policy "Users can manage recurring templates in same household"
on public.recurring_templates for all
using (
  household_id in (select household_id from public.profiles where id = auth.uid())
)
with check (
  household_id in (select household_id from public.profiles where id = auth.uid())
);
