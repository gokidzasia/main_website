create table if not exists public.admin_login_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    email text,
    device_label text,
    device_type text,
    browser text,
    os text,
    user_agent text,
    location_permission text,
    location_label text,
    latitude double precision,
    longitude double precision,
    accuracy_meters double precision,
    created_at timestamptz not null default now()
);

alter table public.admin_login_logs enable row level security;

drop policy if exists "Admins can add their own login logs" on public.admin_login_logs;
create policy "Admins can add their own login logs"
on public.admin_login_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Authenticated admins can read login logs" on public.admin_login_logs;
create policy "Authenticated admins can read login logs"
on public.admin_login_logs
for select
to authenticated
using (true);

create index if not exists admin_login_logs_created_at_idx
on public.admin_login_logs (created_at desc);
