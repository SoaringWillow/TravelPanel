-- TravelPanel — Supabase Postgres schema (Phase B1)
-- Mirrors the IndexedDB v2 stores (items, boards, trips) for cloud sync + backup.
--
-- Design notes:
--   * Local-first stays source of truth; this is additive (backup + multi-device).
--   * Rich/nested fields (locations, activities, substance, plan, agentSteps) are
--     stored as JSONB — they're read/written as whole documents, never queried by
--     inner fields, so a relational explosion buys us nothing.
--   * `id` is the SAME id generated client-side (so local <-> cloud rows line up
--     with no remapping). `user_id` scopes ownership for RLS.
--   * `updated_at` drives last-write-wins conflict resolution during sync.
--
-- To apply: paste into the Supabase SQL editor, or `supabase db push`.

-- ─── items ──────────────────────────────────────────────────────────────────
create table if not exists public.items (
  id            text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  url           text not null,
  platform      text not null,
  title         text not null default '',
  description   text not null default '',
  thumbnail     text,
  locations     jsonb not null default '[]'::jsonb,
  activities    jsonb not null default '[]'::jsonb,
  tags          jsonb not null default '[]'::jsonb,
  substance     jsonb not null default '[]'::jsonb,
  notes         text,
  enrichment_status text not null default 'pending',
  retry_count   integer not null default 0,
  board_id      text,
  is_demo       boolean not null default false,
  saved_at      bigint not null,
  updated_at    timestamptz not null default now()
);

-- ─── boards ─────────────────────────────────────────────────────────────────
create table if not exists public.boards (
  id              text primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  emoji           text not null default '🗺',
  description     text,
  cover_thumbnail text,
  item_ids        jsonb not null default '[]'::jsonb,
  is_demo         boolean not null default false,
  created_at      bigint not null,
  updated_at      timestamptz not null default now()
);

-- ─── trips (plan variants) ────────────────────────────────────────────────────
create table if not exists public.trips (
  id           text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  board_id     text not null,
  board_name   text not null default '',
  name         text,
  days         integer not null default 1,
  preferences  text not null default '',
  agent_steps  jsonb not null default '[]'::jsonb,
  plan         jsonb,
  created_at   bigint not null,
  updated_at   timestamptz not null default now()
);

-- ─── indexes for sync queries ─────────────────────────────────────────────────
create index if not exists items_user_idx  on public.items  (user_id);
create index if not exists boards_user_idx on public.boards (user_id);
create index if not exists trips_user_idx  on public.trips  (user_id);

-- ─── Row-Level Security: each user sees only their own rows ────────────────────
alter table public.items  enable row level security;
alter table public.boards enable row level security;
alter table public.trips  enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['items', 'boards', 'trips'] loop
    execute format('drop policy if exists "owner_all" on public.%I;', t);
    execute format($f$
      create policy "owner_all" on public.%I
        for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;
