-- Greenhouse Lab: schema iniziale
create table if not exists public.simulazioni (
  id bigint generated always as identity primary key,
  livello integer not null check (livello between 0 and 4),
  calore_trattenuto integer not null check (calore_trattenuto between 20 and 60),
  created_at timestamptz not null default now()
);

alter table public.simulazioni enable row level security;

-- Il sito pubblico può salvare solo i valori ammessi dal modello.
drop policy if exists "Inserimento pubblico simulazioni" on public.simulazioni;
create policy "Inserimento pubblico simulazioni"
on public.simulazioni
for insert
to anon
with check (
  livello between 0 and 4
  and calore_trattenuto between 20 and 60
);

-- Consente alla dashboard pubblica di leggere le simulazioni.
drop policy if exists "Lettura pubblica simulazioni" on public.simulazioni;
create policy "Lettura pubblica simulazioni"
on public.simulazioni
for select
to anon
using (true);

grant select, insert on public.simulazioni to anon;
grant usage, select on sequence public.simulazioni_id_seq to anon;
