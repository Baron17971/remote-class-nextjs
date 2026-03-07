create table if not exists public.plans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_public boolean not null default false,
  date text not null,
  lesson_details jsonb not null default '{}'::jsonb,
  plan_data jsonb not null default '{}'::jsonb,
  advanced_options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists plans_user_id_idx on public.plans(user_id);
create index if not exists plans_is_public_idx on public.plans(is_public);
create index if not exists plans_created_at_idx on public.plans(created_at desc);

alter table public.plans enable row level security;

drop policy if exists plans_select_policy on public.plans;
create policy plans_select_policy
on public.plans
for select
using (is_public or auth.uid() = user_id);

drop policy if exists plans_insert_policy on public.plans;
create policy plans_insert_policy
on public.plans
for insert
with check (auth.uid() = user_id);

drop policy if exists plans_update_policy on public.plans;
create policy plans_update_policy
on public.plans
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists plans_delete_policy on public.plans;
create policy plans_delete_policy
on public.plans
for delete
using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant select on table public.plans to anon;
grant select, insert, update, delete on table public.plans to authenticated;
