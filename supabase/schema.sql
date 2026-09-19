-- ==============================================================================
-- PairPay (ペアペイ) Supabase 初期セットアップ SQL (再実行可能・エラー安全版)
-- Supabaseダッシュボードの「SQL Editor」に貼り付けて「RUN」を押すだけで完了します。
-- ==============================================================================

-- 1. 世帯テーブル (夫婦で1レコードを共有)
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '我が家',
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

-- households ポリシー
drop policy if exists "Allow select households for member or with join_code" on public.households;
create policy "Allow select households for member or with join_code"
on public.households for select
using (true);

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
