-- Run this in Supabase SQL Editor

create table if not exists cameras (
  id          text primary key,
  name        text not null,
  location    text,
  active      boolean default true,
  created_at  timestamptz default now()
);

create table if not exists alerts (
  id              uuid primary key default gen_random_uuid(),
  violation_type  text not null,          -- e.g. 'no-helmet', 'no-vest'
  confidence      numeric(5,4) not null,
  bbox            jsonb,                  -- [x1, y1, x2, y2]
  snapshot_b64    text,                   -- JPEG base64 thumbnail
  camera_id       text references cameras(id),
  created_at      timestamptz default now()
);

-- Index for dashboard queries
create index if not exists alerts_created_at_idx on alerts (created_at desc);

-- Enable Realtime for live dashboard
alter publication supabase_realtime add table alerts;

-- Seed a default camera
insert into cameras (id, name, location) values ('cam-0', 'Webcam Principal', 'Planta Baja')
  on conflict (id) do nothing;
