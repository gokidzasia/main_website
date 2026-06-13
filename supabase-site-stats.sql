create table if not exists public.site_page_visits (
    page_key text primary key,
    total_visits bigint not null default 0,
    updated_at timestamptz not null default now()
);

alter table public.site_page_visits enable row level security;

drop policy if exists "Authenticated admins can read site visit stats" on public.site_page_visits;
create policy "Authenticated admins can read site visit stats"
on public.site_page_visits
for select
to authenticated
using (true);

create or replace function public.increment_site_visit(page_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.site_page_visits (page_key, total_visits, updated_at)
    values (page_name, 1, now())
    on conflict (page_key)
    do update set
        total_visits = public.site_page_visits.total_visits + 1,
        updated_at = now();
end;
$$;

grant execute on function public.increment_site_visit(text) to anon, authenticated;
