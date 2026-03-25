-- Run in Supabase SQL Editor
alter table friends add column if not exists starred boolean not null default false;
