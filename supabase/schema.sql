-- IT-oppi: synkronoinnin tietokanta.
-- Aja kerran Supabasen SQL-editorissa (Dashboard → SQL Editor → New query → liitä → Run).

-- Kaikki edistymisdata tallennetaan yhteen tauluun: jokainen rivi on yksi paikallisen
-- tietokannan tietue (taulu + id). Sovellus vertaa updated_at-aikaleimoja: uusin voittaa.
create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  table_name text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  -- Muutoksen aika laitteella (päättää ristiriidat).
  updated_at timestamptz not null,
  -- Palvelimen aika (sovellus hakee tämän perusteella uudet muutokset).
  server_updated_at timestamptz not null default now(),
  primary key (user_id, table_name, id)
);

create index if not exists records_user_server_updated on public.records (user_id, server_updated_at);

-- Taulu näkyy vain kirjautuneille (toimii, vaikka "Automatically expose new tables" olisi pois päältä).
revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;

-- Rivitason käyttöoikeudet: jokainen näkee ja muokkaa vain omia rivejään.
alter table public.records enable row level security;

drop policy if exists "omat rivit" on public.records;
create policy "omat rivit" on public.records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- server_updated_at päivittyy aina palvelimen kellolla. clock_timestamp() antaa jokaiselle riville
-- oman ajan myös saman transaktion sisällä, jotta sovelluksen haku etenee riveittäin.
create or replace function public.touch_server_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.server_updated_at = clock_timestamp();
  return new;
end;
$$;

drop trigger if exists records_touch on public.records;
create trigger records_touch
  before insert or update on public.records
  for each row execute function public.touch_server_updated_at();

-- Muutosten tallennus: vanhempi muutos ei koskaan korvaa uudempaa,
-- vaikka se saapuisi myöhemmin (esim. offline-laitteelta).
create or replace function public.push_records(rows jsonb)
returns void
language sql
security invoker
as $$
  insert into public.records (user_id, table_name, id, data, deleted, updated_at)
  select auth.uid(),
         r ->> 'table_name',
         r ->> 'id',
         r -> 'data',
         coalesce((r ->> 'deleted')::boolean, false),
         (r ->> 'updated_at')::timestamptz
  from jsonb_array_elements(rows) as r
  on conflict (user_id, table_name, id) do update
    set data = excluded.data,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
    where excluded.updated_at >= public.records.updated_at;
$$;

grant execute on function public.push_records(jsonb) to authenticated;
