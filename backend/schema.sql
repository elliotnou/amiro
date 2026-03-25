-- FriendGraph Database Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ═══ ENUMS ═══
create type tier_type as enum ('inner-circle', 'close-friend', 'casual');
create type nudge_icon as enum ('clock', 'cake', 'check');
create type nudge_type as enum ('drift', 'birthday', 'followup');
create type debt_direction as enum ('owe', 'owed');

-- ═══ PROFILES ═══
-- Auto-created when a user signs up (via trigger)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══ FRIENDS ═══
create table friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  initials text not null,
  avatar_color text not null default '#457b9d',
  avatar_url text,
  location text,
  tier tier_type not null default 'casual',
  met_how text,
  met_date date,
  birthday text,
  day_count integer not null default 0,
  starred boolean not null default false,
  tags text[] default '{}',
  interests text[] default '{}',
  ai_label text,
  hangout_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_friends_user_id on friends(user_id);

-- ═══ FRIEND CONTACTS ═══
create table friend_contacts (
  id uuid primary key default gen_random_uuid(),
  friend_id uuid not null references friends(id) on delete cascade,
  phone text,
  email text,
  instagram text,
  twitter text,
  linkedin text,
  snapchat text
);

create unique index idx_friend_contacts_friend_id on friend_contacts(friend_id);

-- ═══ FRIEND FACTS ═══
create table friend_facts (
  id uuid primary key default gen_random_uuid(),
  friend_id uuid not null references friends(id) on delete cascade,
  category text not null,
  value text not null,
  created_at timestamptz default now()
);

create index idx_friend_facts_friend_id on friend_facts(friend_id);

-- ═══ FRIEND NOTES ═══
create table friend_notes (
  id uuid primary key default gen_random_uuid(),
  friend_id uuid not null references friends(id) on delete cascade,
  text text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

create index idx_friend_notes_friend_id on friend_notes(friend_id);

-- ═══ HANGOUTS ═══
create table hangouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  location text not null,
  date date not null,
  highlights text,
  follow_ups text[] default '{}',
  created_at timestamptz default now()
);

create index idx_hangouts_user_id on hangouts(user_id);
create index idx_hangouts_date on hangouts(date desc);

-- ═══ HANGOUT ↔ FRIENDS (junction) ═══
create table hangout_friends (
  id uuid primary key default gen_random_uuid(),
  hangout_id uuid not null references hangouts(id) on delete cascade,
  friend_id uuid not null references friends(id) on delete cascade,
  feeling_label text,
  unique(hangout_id, friend_id)
);

create index idx_hangout_friends_hangout on hangout_friends(hangout_id);
create index idx_hangout_friends_friend on hangout_friends(friend_id);

-- ═══ IMPRESSIONS ═══
create table impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid not null references friends(id) on delete cascade,
  title text not null,
  body text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

create index idx_impressions_friend on impressions(friend_id);

-- ═══ NUDGES ═══
create table nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  icon nudge_icon not null,
  message text not null,
  type nudge_type not null,
  ai_action boolean default false,
  dismissed boolean default false,
  created_at timestamptz default now()
);

create index idx_nudges_user on nudges(user_id);

-- ═══ DEBTS ═══
create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  hangout_id uuid references hangouts(id) on delete set null,
  friend_id uuid not null references friends(id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null,
  direction debt_direction not null,
  settled boolean default false,
  created_at timestamptz default now()
);

create index idx_debts_user on debts(user_id);

-- ═══ PROFILE CUSTOMIZATIONS ═══
create table profile_customizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid not null references friends(id) on delete cascade,
  theme_color text,
  font text,
  effect text,
  updated_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- ═══ GALLERY IMAGES ═══
create table gallery_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid references friends(id) on delete set null,
  hangout_id uuid references hangouts(id) on delete set null,
  url text not null,
  caption text,
  created_at timestamptz default now()
);

create index idx_gallery_user on gallery_images(user_id);
create index idx_gallery_friend on gallery_images(friend_id);

-- ═══ ROW LEVEL SECURITY ═══
-- Every table is locked down so users can only see/edit their own data

alter table profiles enable row level security;
alter table friends enable row level security;
alter table friend_contacts enable row level security;
alter table friend_facts enable row level security;
alter table friend_notes enable row level security;
alter table hangouts enable row level security;
alter table hangout_friends enable row level security;
alter table impressions enable row level security;
alter table nudges enable row level security;
alter table debts enable row level security;
alter table profile_customizations enable row level security;
alter table gallery_images enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Friends: full CRUD on own friends
create policy "Users can view own friends" on friends for select using (auth.uid() = user_id);
create policy "Users can create friends" on friends for insert with check (auth.uid() = user_id);
create policy "Users can update own friends" on friends for update using (auth.uid() = user_id);
create policy "Users can delete own friends" on friends for delete using (auth.uid() = user_id);

-- Friend contacts: access via friend ownership
create policy "Users can view friend contacts" on friend_contacts for select
  using (exists (select 1 from friends where friends.id = friend_contacts.friend_id and friends.user_id = auth.uid()));
create policy "Users can create friend contacts" on friend_contacts for insert
  with check (exists (select 1 from friends where friends.id = friend_contacts.friend_id and friends.user_id = auth.uid()));
create policy "Users can update friend contacts" on friend_contacts for update
  using (exists (select 1 from friends where friends.id = friend_contacts.friend_id and friends.user_id = auth.uid()));
create policy "Users can delete friend contacts" on friend_contacts for delete
  using (exists (select 1 from friends where friends.id = friend_contacts.friend_id and friends.user_id = auth.uid()));

-- Friend facts
create policy "Users can view friend facts" on friend_facts for select
  using (exists (select 1 from friends where friends.id = friend_facts.friend_id and friends.user_id = auth.uid()));
create policy "Users can create friend facts" on friend_facts for insert
  with check (exists (select 1 from friends where friends.id = friend_facts.friend_id and friends.user_id = auth.uid()));
create policy "Users can update friend facts" on friend_facts for update
  using (exists (select 1 from friends where friends.id = friend_facts.friend_id and friends.user_id = auth.uid()));
create policy "Users can delete friend facts" on friend_facts for delete
  using (exists (select 1 from friends where friends.id = friend_facts.friend_id and friends.user_id = auth.uid()));

-- Friend notes
create policy "Users can view friend notes" on friend_notes for select
  using (exists (select 1 from friends where friends.id = friend_notes.friend_id and friends.user_id = auth.uid()));
create policy "Users can create friend notes" on friend_notes for insert
  with check (exists (select 1 from friends where friends.id = friend_notes.friend_id and friends.user_id = auth.uid()));
create policy "Users can update friend notes" on friend_notes for update
  using (exists (select 1 from friends where friends.id = friend_notes.friend_id and friends.user_id = auth.uid()));
create policy "Users can delete friend notes" on friend_notes for delete
  using (exists (select 1 from friends where friends.id = friend_notes.friend_id and friends.user_id = auth.uid()));

-- Hangouts
create policy "Users can view own hangouts" on hangouts for select using (auth.uid() = user_id);
create policy "Users can create hangouts" on hangouts for insert with check (auth.uid() = user_id);
create policy "Users can update own hangouts" on hangouts for update using (auth.uid() = user_id);
create policy "Users can delete own hangouts" on hangouts for delete using (auth.uid() = user_id);

-- Hangout friends: access via hangout ownership
create policy "Users can view hangout friends" on hangout_friends for select
  using (exists (select 1 from hangouts where hangouts.id = hangout_friends.hangout_id and hangouts.user_id = auth.uid()));
create policy "Users can create hangout friends" on hangout_friends for insert
  with check (exists (select 1 from hangouts where hangouts.id = hangout_friends.hangout_id and hangouts.user_id = auth.uid()));
create policy "Users can delete hangout friends" on hangout_friends for delete
  using (exists (select 1 from hangouts where hangouts.id = hangout_friends.hangout_id and hangouts.user_id = auth.uid()));

-- Impressions
create policy "Users can view own impressions" on impressions for select using (auth.uid() = user_id);
create policy "Users can create impressions" on impressions for insert with check (auth.uid() = user_id);
create policy "Users can update own impressions" on impressions for update using (auth.uid() = user_id);
create policy "Users can delete own impressions" on impressions for delete using (auth.uid() = user_id);

-- Nudges
create policy "Users can view own nudges" on nudges for select using (auth.uid() = user_id);
create policy "Users can create nudges" on nudges for insert with check (auth.uid() = user_id);
create policy "Users can update own nudges" on nudges for update using (auth.uid() = user_id);

-- Debts
create policy "Users can view own debts" on debts for select using (auth.uid() = user_id);
create policy "Users can create debts" on debts for insert with check (auth.uid() = user_id);
create policy "Users can update own debts" on debts for update using (auth.uid() = user_id);
create policy "Users can delete own debts" on debts for delete using (auth.uid() = user_id);

-- Profile customizations
create policy "Users can view own customizations" on profile_customizations for select using (auth.uid() = user_id);
create policy "Users can create customizations" on profile_customizations for insert with check (auth.uid() = user_id);
create policy "Users can update own customizations" on profile_customizations for update using (auth.uid() = user_id);

-- Gallery images
create policy "Users can view own images" on gallery_images for select using (auth.uid() = user_id);
create policy "Users can upload images" on gallery_images for insert with check (auth.uid() = user_id);
create policy "Users can update own images" on gallery_images for update using (auth.uid() = user_id);
create policy "Users can delete own images" on gallery_images for delete using (auth.uid() = user_id);

-- ═══ AUTO-CREATE PROFILE ON SIGNUP ═══
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══ AUTO-UPDATE updated_at ═══
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger friends_updated_at before update on friends for each row execute function update_updated_at();
create trigger profile_customizations_updated_at before update on profile_customizations for each row execute function update_updated_at();
