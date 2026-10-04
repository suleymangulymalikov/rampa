-- Rampa: run this once in the Supabase SQL editor.

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  lat           double precision not null,
  lng           double precision not null,
  type          text not null check (type in ('construction', 'broken_elevator', 'blocked_sidewalk', 'high_curb')),
  photo_url     text,
  created_at    timestamptz not null default now(),
  confirmations integer not null default 0,
  status        text not null default 'active' check (status in ('active', 'fixed')),
  is_demo       boolean not null default false
);

create index if not exists reports_status_idx on public.reports (status);

-- No accounts in the MVP, so anyone with the anon key can read, add and update reports.
alter table public.reports enable row level security;

create policy "reports are readable by everyone"
  on public.reports for select using (true);
create policy "anyone can add a report"
  on public.reports for insert with check (true);
create policy "anyone can update a report"
  on public.reports for update using (true) with check (true);

grant select, insert, update on public.reports to anon, authenticated;

-- Realtime: new reports show up on every open map.
alter publication supabase_realtime add table public.reports;

-- Photos: public bucket, anyone can upload and view.
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

create policy "report photos are viewable by everyone"
  on storage.objects for select using (bucket_id = 'report-photos');
create policy "anyone can upload report photos"
  on storage.objects for insert with check (bucket_id = 'report-photos');
